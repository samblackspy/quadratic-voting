use anchor_lang::prelude::*;

#[account]
pub struct Dao {
    pub name: String,
    pub authority: Pubkey,
    pub proposal_count: u64,
    pub bump: u8,
}

impl Dao {
    pub const INIT_SPACE: usize = 8 + 4 + 32 + 32 + 8 + 1;
}
