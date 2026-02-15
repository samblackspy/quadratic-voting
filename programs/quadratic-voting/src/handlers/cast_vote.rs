use anchor_lang::prelude::*;
use crate::CastVote;
use crate::QvError;

pub fn handler(ctx: Context<CastVote>, vote_type: u8) -> Result<()> {
    require!(vote_type == 0 || vote_type == 1, QvError::InvalidVoteType);

    let token_amount = ctx.accounts.voter_token_account.amount;
    let credits = quadratic_sqrt(token_amount);

    let vote = &mut ctx.accounts.vote_account;
    vote.authority = ctx.accounts.voter.key();
    vote.vote_type = vote_type;
    vote.credits = credits;

    let proposal = &mut ctx.accounts.proposal_account;
    if vote_type == 1 {
        proposal.yes_vote_count = proposal.yes_vote_count.checked_add(credits).unwrap();
    } else {
        proposal.no_vote_count = proposal.no_vote_count.checked_add(credits).unwrap();
    }
    Ok(())
}

pub fn quadratic_sqrt(tokens: u64) -> u64 {
    if tokens == 0 {
        return 0;
    }
    let mut x = tokens;
    let mut y = (x + 1) / 2;
    while y < x {
        x = y;
        y = (x + tokens / x) / 2;
    }
    x
}
