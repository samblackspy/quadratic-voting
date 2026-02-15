use anchor_lang::prelude::*;
use crate::InitializeProposal;

pub fn handler(ctx: Context<InitializeProposal>, metadata: String) -> Result<()> {
    let proposal = &mut ctx.accounts.proposal_account;
    let dao = &mut ctx.accounts.dao_account;

    proposal.authority = dao.authority;
    proposal.metadata = metadata;
    proposal.yes_vote_count = 0;
    proposal.no_vote_count = 0;
    proposal.bump = ctx.bumps.proposal_account;

    dao.proposal_count = dao.proposal_count.checked_add(1).unwrap();
    Ok(())
}
