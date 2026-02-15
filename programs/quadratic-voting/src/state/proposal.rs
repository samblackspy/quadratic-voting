use anchor_lang::prelude::*;

#[account]
pub struct Proposal {
    pub authority: Pubkey,
    pub metadata: String,
    pub yes_vote_count: u64,
    pub no_vote_count: u64,
    pub bump: u8,
}

impl Proposal {
    pub const INIT_SPACE: usize = 8 + 32 + 4 + 200 + 8 + 8 + 1;
}
