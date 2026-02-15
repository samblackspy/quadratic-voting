use anchor_lang::prelude::*;

#[account]
pub struct Vote {
    pub authority: Pubkey,
    pub vote_type: u8,
    pub credits: u64,
}

impl Vote {
    pub const INIT_SPACE: usize = 8 + 32 + 1 + 8;
}
