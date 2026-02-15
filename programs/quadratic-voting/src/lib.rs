use anchor_lang::prelude::*;
use anchor_spl::token_interface::{TokenAccount, TokenInterface};

pub mod state;
pub mod handlers;

use state::*;

declare_id!("7X7gfKDXpwiZ5KDR9DoKTvEyiYtDNBcJbtudmzkjvdLc");

#[program]
pub mod quadratic_voting {
    use super::*;

    pub fn initialize_dao(ctx: Context<InitializeDao>, name: String) -> Result<()> {
        handlers::initialize_dao::handler(ctx, name)
    }

    pub fn initialize_proposal(ctx: Context<InitializeProposal>, metadata: String) -> Result<()> {
        handlers::initialize_proposal::handler(ctx, metadata)
    }

    pub fn cast_vote(ctx: Context<CastVote>, vote_type: u8) -> Result<()> {
        handlers::cast_vote::handler(ctx, vote_type)
    }
}

// ── Instruction Account Contexts ────────────────────────

#[derive(Accounts)]
#[instruction(name: String)]
pub struct InitializeDao<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        init,
        payer = admin,
        space = Dao::INIT_SPACE,
        seeds = [b"dao", name.as_bytes(), admin.key().as_ref()],
        bump
    )]
    pub dao_account: Account<'info, Dao>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(metadata: String)]
pub struct InitializeProposal<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        mut,
        constraint = dao_account.authority == admin.key()
    )]
    pub dao_account: Account<'info, Dao>,

    #[account(
        init,
        payer = admin,
        space = Proposal::INIT_SPACE,
        seeds = [b"proposal", dao_account.key().as_ref(), &dao_account.proposal_count.to_le_bytes()],
        bump
    )]
    pub proposal_account: Account<'info, Proposal>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CastVote<'info> {
    #[account(mut)]
    pub voter: Signer<'info>,

    pub dao_account: Account<'info, Dao>,

    #[account(mut)]
    pub proposal_account: Account<'info, Proposal>,

    #[account(
        init,
        payer = voter,
        space = Vote::INIT_SPACE,
        seeds = [b"vote", voter.key().as_ref(), proposal_account.key().as_ref()],
        bump
    )]
    pub vote_account: Account<'info, Vote>,

    #[account(
        constraint = voter_token_account.owner == voter.key()
    )]
    pub voter_token_account: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

// ── Errors ──────────────────────────────────────────────

#[error_code]
pub enum QvError {
    #[msg("Invalid vote type. Must be 0 (no) or 1 (yes)")]
    InvalidVoteType,
    #[msg("Insufficient tokens to vote")]
    InsufficientTokens,
    #[msg("Unauthorized access")]
    Unauthorized,
}
