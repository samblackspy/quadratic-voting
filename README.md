# Quadratic Voting on Solana

This is my implementation of a quadratic voting system for DAOs on Solana. I built it using Anchor to learn how governance systems work on-chain.

## What is Quadratic Voting?

Normal voting is simple: 1 token = 1 vote. But this means rich people ("whales") can control everything.

Quadratic voting makes it harder to dominate:
- 1 token = 1 vote
- 4 tokens = 2 votes  
- 9 tokens = 3 votes
- 100 tokens = 10 votes

So if you have 100 tokens, you don't get 100 votes - you only get 10! This makes voting more fair.

## Project Structure

```
programs/quadratic-voting/src/
├── lib.rs                    # Main program
├── state/                    # Data structures
│   ├── dao.rs               # DAO info
│   ├── proposal.rs          # Proposal info  
│   └── vote.rs              # Vote info
└── handlers/                # Instruction logic
    ├── initialize_dao.rs    # Create DAO
    ├── initialize_proposal.rs # Create proposal
    └── cast_vote.rs         # Vote with quadratic math
```

## What It Does

1. **Create DAOs** - Anyone can start a DAO with a name
2. **Make Proposals** - DAO authority can create proposals
3. **Vote** - People vote using quadratic math (√tokens = votes)
4. **Track Results** - Counts yes/no votes for each proposal

## The Data Structures

### DAO
```rust
pub struct Dao {
    pub name: String,          // DAO name
    pub authority: Pubkey,     // Who runs it
    pub proposal_count: u64,   // How many proposals
    pub bump: u8,              // Solana PDA stuff
}
```

### Proposal  
```rust
pub struct Proposal {
    pub authority: Pubkey,     // Who made it
    pub metadata: String,      // What it's about
    pub yes_vote_count: u64,   // Yes votes total
    pub no_vote_count: u64,    // No votes total
    pub bump: u8,              // PDA bump
}
```

### Vote
```rust
pub struct Vote {
    pub authority: Pubkey,     // Who voted
    pub vote_type: u8,         // 0 = no, 1 = yes
    pub credits: u64,          // Voting power calculated
}
```

## How to Use

### 1. Create a DAO
```typescript
await program.methods
  .initializeDao("My Cool DAO")
  .accounts({
    admin: admin.publicKey,
    daoAccount,
    systemProgram: SystemProgram.programId,
  })
  .rpc();
```

### 2. Make a Proposal
```typescript
await program.methods
  .initializeProposal("Should we add this feature?")
  .accounts({
    admin: admin.publicKey,
    daoAccount,
    proposalAccount,
    systemProgram: SystemProgram.programId,
  })
  .rpc();
```

### 3. Vote
```typescript
await program.methods
  .castVote(1) // 1 = yes, 0 = no
  .accounts({
    voter: voter.publicKey,
    daoAccount,
    proposalAccount,
    voteAccount,
    voterTokenAccount,
    tokenProgram: TOKEN_PROGRAM_ID,
    systemProgram: SystemProgram.programId,
  })
  .signers([voter])
  .rpc();
```

## Setup

```bash
# Install dependencies
yarn install

# Build it
anchor build

# Run tests
anchor test

# Deploy to devnet
anchor deploy --provider.cluster devnet
```

## Testing

I wrote tests to make sure everything works:
- Creating DAOs ✅
- Making proposals ✅  
- Voting with quadratic math ✅
- Multiple proposals ✅
- Stopping bad votes ✅

Run `anchor test` to see them pass.

## Security Stuff I Learned

**Sybil Attacks**: Someone with lots of tokens could split them into many wallets to get more votes. This is hard to prevent in DeFi without KYC.

**Access Control**: Only the DAO authority can create proposals, and each person can only vote once per proposal.

## What's Next?

Things I want to add:
- [ ] Vote delegation
- [ ] Proposal time limits  
- [ ] Minimum participation rules
- [ ] Actually execute proposals
- [ ] Multi-sig for DAO authority

## Resources That Helped Me

- [Vitalik's post on quadratic voting](https://vitalik.ca/general/2019/12/07/quadratic.html)
- [Anchor docs](https://www.anchor-lang.com/)
- [Solana cookbook](https://solanacookbook.com/)

## License

MIT

Built for Turbine Cohort Assignment 1