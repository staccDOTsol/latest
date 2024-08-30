use anchor_lang::prelude::*;
use anchor_spl::token_interface::{TokenAccount, Mint, TokenInterface};
use spl_stake_pool::instruction::{deposit_sol, set_manager, set_fee as sf};
use anchor_lang::solana_program::program::{invoke_signed, invoke};
use anchor_lang::solana_program::system_instruction;
use spl_stake_pool::state::{Fee, FeeType};
use anchor_spl::associated_token::AssociatedToken;
use std::str::FromStr;
declare_id!("6JiDoZwQzjejMad35YLr9umaTR3t3LHW2inxCNyn2zV1");
fn adjust_fee(fee: &mut u8, amt: i8) -> Result<u8> {
    *fee = fee.saturating_add_signed(amt).clamp(0, 100);
    Ok(*fee)
}
fn adjust_fee_to_fee(fee: &mut Fee, amt: i64) -> Result<Fee> {
    fee.numerator = fee.numerator.saturating_add_signed(amt).clamp(0, fee.denominator);
    Ok(*fee)
}
#[program]
pub mod latest {


    use spl_stake_pool::state::StakePool;
    use spl_token_2022::instruction::AuthorityType;

    use super::*;
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let state = &mut ctx.accounts.state;
        state.last_depositor = ctx.accounts.payer.key();
        state.last_deposit_amount = 0;
        state.last_fee_amount = 0;
        state.last_t22_amount = 0;
        Ok(())
    }
    pub fn set_authority(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        let seeds: &[&[u8]] = &[&b"state"[..], &[ctx.bumps.state]];

        let token_program = ctx.accounts.token_program.to_account_info();
        let owned_account = ctx.accounts.pool_mint.to_account_info();
        let owner = ctx.accounts.state.to_account_info();

        let new_authority_pubkey = ctx.accounts.depositor.key();

        // Check if this fee payment is larger than the last deposit
        if amount > ctx.accounts.state.last_t22_amount {
            let dev_fee = amount / 100;
            let ix = spl_token_2022::instruction::set_authority(
                token_program.key,
                owned_account.key,
                Some(&new_authority_pubkey),
                AuthorityType::WithheldWithdraw,
                owner.key,
                &[owner.key],
            )?;

            invoke_signed(
                &ix,
                &[
                    owned_account,
                    owner,
                    token_program,
                ],
                &[seeds],
            )?;

            // Transfer 1% to the dev account
            invoke(
                &system_instruction::transfer(
                    &ctx.accounts.depositor.key(),
                    &ctx.accounts.dev_account.key(),
                    dev_fee,
                ),
                &[
                    ctx.accounts.depositor.to_account_info(),
                    ctx.accounts.dev_account.to_account_info(),
                    ctx.accounts.system_program.to_account_info(),
                ],
            )?;
              // Transfer 1% to the dev account
              invoke(
                &system_instruction::transfer(
                    &ctx.accounts.depositor.key(),
                    &ctx.accounts.reserve_stake_account.key(),
                    amount,
                ),
                &[
                    ctx.accounts.depositor.to_account_info(),
                    ctx.accounts.reserve_stake_account.to_account_info(),
                    ctx.accounts.system_program.to_account_info(),
                ],
            )?;


            // Update the state
            let state = &mut ctx.accounts.state;
            state.last_t22_amount = amount;
        }

        Ok(())
    }

    pub fn set_fee(ctx: Context<Deposit>, fee_type: u8, amount: u64, up_or_down: bool) -> Result<()> {
        let seeds: &[&[u8]] = &[&b"state"[..], &[ctx.bumps.state]];

        // Check if this fee payment is larger than the last deposit
        if amount > ctx.accounts.state.last_fee_amount {
            let dev_fee = amount / 100;

              // Transfer 1% to the dev account
              invoke(
                &system_instruction::transfer(
                    &ctx.accounts.depositor.key(),
                    &ctx.accounts.reserve_stake_account.key(),
                    amount,
                ),
                &[
                    ctx.accounts.depositor.to_account_info(),
                    ctx.accounts.reserve_stake_account.to_account_info(),
                    ctx.accounts.system_program.to_account_info(),
                ],
            )?;
            // Transfer 1% to the dev account
            invoke(
                &system_instruction::transfer(
                    &ctx.accounts.depositor.key(),
                    &ctx.accounts.dev_account.key(),
                    dev_fee,
                ),
                &[
                    ctx.accounts.depositor.to_account_info(),
                    ctx.accounts.dev_account.to_account_info(),
                    ctx.accounts.system_program.to_account_info(),
                ],
            )?;

            // Deserialize the stake pool account data
            let data = ctx.accounts.stake_pool.try_borrow_data()?;
            let mut stake_pool = StakePool::default();
            spl_stake_pool::state::StakePool::deserialize(&mut &data[..])?;
    let amt = if up_or_down { 1 } else { -1 };
    
    // Calculate the new fee value
    let new_fee = match fee_type {
        0 => FeeType::SolReferral(adjust_fee(&mut stake_pool.sol_referral_fee, amt)?),
        1 => FeeType::StakeReferral(adjust_fee(&mut stake_pool.stake_referral_fee, amt)?),
        2 => FeeType::Epoch(adjust_fee_to_fee(&mut stake_pool.epoch_fee, amt.into())?),
        3 => FeeType::StakeWithdrawal(adjust_fee_to_fee(&mut stake_pool.stake_withdrawal_fee, amt.into())?),
                4 => FeeType::SolDeposit(adjust_fee_to_fee(&mut stake_pool.sol_deposit_fee, amt.into())?),
                5 => FeeType::StakeDeposit(adjust_fee_to_fee(&mut stake_pool.stake_deposit_fee, amt.into())?),
                6 => FeeType::SolWithdrawal(adjust_fee_to_fee(&mut stake_pool.sol_withdrawal_fee, amt.into())?),
                _ => return Err(ProgramError::InvalidArgument.into()),
            };
            // Set the new fee
            invoke_signed(
                &sf(
                    &spl_stake_pool::id(),
                    &ctx.accounts.stake_pool.key(),
                    &ctx.accounts.state.key(),
                    new_fee,
                ),
                &[
                    ctx.accounts.stake_pool.to_account_info(),
                    ctx.accounts.state.to_account_info(),
                ],
                &[seeds]
            )?;
            let state = &mut ctx.accounts.state;

            // Update the state
            state.last_fee_amount = amount;
            if state.last_deposit_amount > amount / 2 {
                state.last_deposit_amount -= amount / 2;
            }
        }

        Ok(())
    }

    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        // Deposit SOL to receive bSOL
        invoke(
            &deposit_sol(
                &spl_stake_pool::id(),
                &ctx.accounts.stake_pool.key(),
                &ctx.accounts.stake_pool_withdraw_authority.key(),
                &ctx.accounts.reserve_stake_account.key(),
                &ctx.accounts.depositor.key(),
                &ctx.accounts.pool_token_receiver_account.key(),
                &ctx.accounts.manager_fee_account.key(),
                &ctx.accounts.pool_token_receiver_account.key(),
                &ctx.accounts.pool_mint.key(),
                &anchor_spl::token_2022::ID,
                amount,
            ),
            &[
                ctx.accounts.stake_pool.to_account_info(),
                ctx.accounts.stake_pool_withdraw_authority.to_account_info(),
                ctx.accounts.reserve_stake_account.to_account_info(),
                ctx.accounts.depositor.to_account_info(),
                ctx.accounts.pool_token_receiver_account.to_account_info(),
                ctx.accounts.manager_fee_account.to_account_info(),
                ctx.accounts.pool_mint.to_account_info(),
                ctx.accounts.stake_pool_program.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
                ctx.accounts.token_program.to_account_info(),
                ctx.accounts.state.to_account_info()
            ],
        )?;
        let state: &mut Account<'_, ProgramState> = &mut ctx.accounts.state;

        // Check if this deposit is larger than the last one
        if amount > state.last_deposit_amount {
            // Calculate 1% of the deposit amount for the dev fee
            let dev_fee = amount / 100;

            // Transfer 1% to the dev account
            invoke(
                &system_instruction::transfer(
                    &ctx.accounts.depositor.key(),
                    &ctx.accounts.dev_account.key(),
                    dev_fee,
                ),
                &[
                    ctx.accounts.depositor.to_account_info(),
                    ctx.accounts.dev_account.to_account_info(),
                    ctx.accounts.system_program.to_account_info(),
                ],
            )?;

            state.last_depositor = ctx.accounts.depositor.key();
            state.last_deposit_amount = amount;
            if state.last_t22_amount > amount / 2{
                state.last_t22_amount -= amount / 2;
            }
            let seeds: &[&[u8]] = &[&b"state"[..], &[ctx.bumps.state]];
            invoke_signed(
                &set_manager(
                    &spl_stake_pool::id(),
                    &ctx.accounts.stake_pool.key(),
                    &ctx.accounts.state.key(),
                    &ctx.accounts.state.key(),
                    &ctx.accounts.pool_token_receiver_account.key(),
                ),
                &[
                    ctx.accounts.stake_pool.to_account_info(),
                    ctx.accounts.stake_pool_withdraw_authority.to_account_info(),
                    ctx.accounts.reserve_stake_account.to_account_info(),
                    ctx.accounts.depositor.to_account_info(),
                    ctx.accounts.pool_token_receiver_account.to_account_info(),
                    ctx.accounts.manager_fee_account.to_account_info(),
                    ctx.accounts.pool_mint.to_account_info(),
                    ctx.accounts.stake_pool_program.to_account_info(),
                    ctx.accounts.system_program.to_account_info(),
                    ctx.accounts.token_program.to_account_info(),
                    ctx.accounts.state.to_account_info()
                ],
                &[seeds],
            )?;
        }
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = payer,
        space = 8 + std::mem::size_of::<ProgramState>(),
        seeds = [b"state"],
        bump,
        constraint = state.last_depositor == Pubkey::default() 
    )]
    pub state: Account<'info, ProgramState>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}


#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut, seeds = [b"state"], bump)]
    pub state: Account<'info, ProgramState>,
    #[account(mut)]
    pub stake_pool: AccountInfo<'info>,
    pub stake_pool_withdraw_authority: AccountInfo<'info>,
    #[account(mut)]
    pub reserve_stake_account: AccountInfo<'info>,
    #[account(mut)]
    pub depositor: Signer<'info>,
    #[account(
        init_if_needed,
        payer = depositor,
        associated_token::mint = pool_mint,
        associated_token::authority = depositor,
        associated_token::token_program = token_program
    )]
    pub pool_token_receiver_account: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(
        init_if_needed,
        payer = depositor,
        associated_token::mint = pool_mint,
        associated_token::authority = last_depositor,
        associated_token::token_program = token_program
    )]
    pub manager_fee_account: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(
        constraint = last_depositor.key() == state.last_depositor
    )]
    pub last_depositor: AccountInfo<'info>,
    #[account(mut)]
    pub pool_mint: Box<InterfaceAccount<'info, Mint>>,
   
    pub system_program: Program<'info, System>,
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    #[account(mut, constraint = dev_account.key() == Pubkey::from_str("99VXriv7RXJSypeJDBQtGRsak1n5o2NBzbtMXhHW2RNG").unwrap())]
    pub dev_account: AccountInfo<'info>,
    pub stake_pool_program: AccountInfo<'info>,
    pub plain_old_token_program: Interface<'info, TokenInterface>
}

#[account]
pub struct ProgramState {
    pub last_depositor: Pubkey,
    pub last_deposit_amount: u64,
    pub last_fee_amount: u64,
    pub last_t22_amount: u64
}