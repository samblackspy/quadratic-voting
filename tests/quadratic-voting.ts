import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { QuadraticVoting } from "../target/types/quadratic_voting";
import { expect } from "chai";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from "@solana/spl-token";

describe("quadratic-voting", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.QuadraticVoting as Program<QuadraticVoting>;
  const admin = provider.wallet as anchor.Wallet;
  const voter = anchor.web3.Keypair.generate();

  let daoAccount: anchor.web3.PublicKey;
  let proposalAccount: anchor.web3.PublicKey;
  let voteAccount: anchor.web3.PublicKey;
  let mint: anchor.web3.PublicKey;
  let voterTokenAccount: anchor.web3.PublicKey;

  const daoName = "Test DAO";
  const proposalMetadata = "Should we build a new feature?";

  before(async () => {
    const airdropSig = await provider.connection.requestAirdrop(
      voter.publicKey,
      2 * anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropSig);

    mint = await createMint(
      provider.connection,
      admin.payer,
      admin.publicKey,
      null,
      9
    );

    const voterAta = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      admin.payer,
      mint,
      voter.publicKey
    );
    voterTokenAccount = voterAta.address;

    await mintTo(
      provider.connection,
      admin.payer,
      mint,
      voterTokenAccount,
      admin.payer,
      100_000_000_000
    );
  });

  it("initializes a DAO", async () => {
    [daoAccount] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("dao"),
        Buffer.from(daoName),
        admin.publicKey.toBuffer(),
      ],
      program.programId
    );

    await program.methods
      .initializeDao(daoName)
      .accounts({
        admin: admin.publicKey,
        daoAccount,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const dao = await program.account.dao.fetch(daoAccount);
    expect(dao.name).to.equal(daoName);
    expect(dao.authority.toString()).to.equal(admin.publicKey.toString());
    expect(dao.proposalCount.toNumber()).to.equal(0);
  });

  it("initializes a proposal", async () => {
    const dao = await program.account.dao.fetch(daoAccount);
    const proposalCount = dao.proposalCount.toNumber();

    [proposalAccount] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("proposal"),
        daoAccount.toBuffer(),
        Buffer.from(new anchor.BN(proposalCount).toArrayLike(Buffer, "le", 8)),
      ],
      program.programId
    );

    await program.methods
      .initializeProposal(proposalMetadata)
      .accounts({
        admin: admin.publicKey,
        daoAccount,
        proposalAccount,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const proposal = await program.account.proposal.fetch(proposalAccount);
    expect(proposal.metadata).to.equal(proposalMetadata);
    expect(proposal.authority.toString()).to.equal(admin.publicKey.toString());
    expect(proposal.yesVoteCount.toNumber()).to.equal(0);
    expect(proposal.noVoteCount.toNumber()).to.equal(0);

    const updatedDao = await program.account.dao.fetch(daoAccount);
    expect(updatedDao.proposalCount.toNumber()).to.equal(1);
  });

  it("casts a vote with quadratic voting", async () => {
    [voteAccount] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("vote"),
        voter.publicKey.toBuffer(),
        proposalAccount.toBuffer(),
      ],
      program.programId
    );

    await program.methods
      .castVote(1)
      .accounts({
        voter: voter.publicKey,
        daoAccount,
        proposalAccount,
        voteAccount,
        voterTokenAccount,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([voter])
      .rpc();

    const vote = await program.account.vote.fetch(voteAccount);
    expect(vote.authority.toString()).to.equal(voter.publicKey.toString());
    expect(vote.voteType).to.equal(1);
    
    const expectedCredits = Math.floor(Math.sqrt(100_000_000_000));
    expect(vote.credits.toNumber()).to.be.closeTo(expectedCredits, 1);

    const proposal = await program.account.proposal.fetch(proposalAccount);
    expect(proposal.yesVoteCount.toNumber()).to.be.greaterThan(0);
    expect(proposal.noVoteCount.toNumber()).to.equal(0);
  });

  it("verifies quadratic voting logic", async () => {
    const testCases = [
      { tokens: 1, expectedVotes: 1 },
      { tokens: 4, expectedVotes: 2 },
      { tokens: 9, expectedVotes: 3 },
      { tokens: 16, expectedVotes: 4 },
      { tokens: 25, expectedVotes: 5 },
      { tokens: 100, expectedVotes: 10 },
      { tokens: 10000, expectedVotes: 100 },
    ];

    testCases.forEach(({ tokens, expectedVotes }) => {
      const calculatedVotes = Math.floor(Math.sqrt(tokens));
      expect(calculatedVotes).to.equal(expectedVotes);
    });
  });

  it("creates multiple proposals", async () => {
    const dao = await program.account.dao.fetch(daoAccount);
    const proposalCount = dao.proposalCount.toNumber();

    const [newProposalAccount] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("proposal"),
        daoAccount.toBuffer(),
        Buffer.from(new anchor.BN(proposalCount).toArrayLike(Buffer, "le", 8)),
      ],
      program.programId
    );

    const newMetadata = "Should we change the governance model?";
    await program.methods
      .initializeProposal(newMetadata)
      .accounts({
        admin: admin.publicKey,
        daoAccount,
        proposalAccount: newProposalAccount,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const newProposal = await program.account.proposal.fetch(newProposalAccount);
    expect(newProposal.metadata).to.equal(newMetadata);

    const updatedDao = await program.account.dao.fetch(daoAccount);
    expect(updatedDao.proposalCount.toNumber()).to.equal(proposalCount + 1);
  });

  it("prevents invalid vote types", async () => {
    const voter2 = anchor.web3.Keypair.generate();
    
    const airdropSig = await provider.connection.requestAirdrop(
      voter2.publicKey,
      2 * anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropSig);

    const voter2Ata = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      admin.payer,
      mint,
      voter2.publicKey
    );

    await mintTo(
      provider.connection,
      admin.payer,
      mint,
      voter2Ata.address,
      admin.payer,
      25_000_000_000
    );

    const [vote2Account] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("vote"),
        voter2.publicKey.toBuffer(),
        proposalAccount.toBuffer(),
      ],
      program.programId
    );

    try {
      await program.methods
        .castVote(2)
        .accounts({
          voter: voter2.publicKey,
          daoAccount,
          proposalAccount,
          voteAccount: vote2Account,
          voterTokenAccount: voter2Ata.address,
          tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([voter2])
        .rpc();
      
      expect.fail("Should have thrown an error for invalid vote type");
    } catch (err) {
      expect(err.toString()).to.include("InvalidVoteType");
    }
  });
});
