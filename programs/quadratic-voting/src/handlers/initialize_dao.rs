use anchor_lang::prelude::*;
use crate::InitializeDao;

pub fn handler(ctx: Context<InitializeDao>, name: String) -> Result<()> {
    let dao = &mut ctx.accounts.dao_account;
    dao.name = name;
    dao.authority = ctx.accounts.admin.key();
    dao.proposal_count = 0;
    dao.bump = ctx.bumps.dao_account;
    Ok(())
}
