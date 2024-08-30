import { useState, useEffect } from 'react';
import { Container, Title, Button, Text, Stack, Alert, Box, NumberInput, Group, List, Accordion, Select } from '@mantine/core';
import { useAnchorWallet, useWallet } from '@solana/wallet-adapter-react';
import { Program, AnchorProvider, Idl } from '@coral-xyz/anchor';
import { ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync, getMint, getTransferFeeConfig, TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID, unpackMint } from '@solana/spl-token';
import * as splStakePool from '@solana/spl-stake-pool'
import { IconArrowRight } from '@tabler/icons-react';
import classes from './Landing.module.css';
const web3 = require('@solana/web3.js')
import { MintLayout } from '@solana/spl-token'
import { Anchor } from '@mantine/core';
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { BN } from 'bn.js';
const gameExplanation = `
Welcome to Fomo3d Stake Pool - a DeFi game on Solana!

How to play:
1. Deposit SOL into the stake pool.
2. The last depositor becomes the pool manager.
3. As manager, you can adjust various fees:
   - SOL and Stake referral fees
   - Epoch fees
   - Deposit and withdrawal fees for both SOL and Stake
4. Pay to adjust these fees and potentially earn more rewards.
5. The game continues as new players deposit and try to become the manager.

Strategy:
- Time your deposits to become the last depositor and gain control.
- Adjust fees wisely to maximize your earnings while keeping the pool attractive.
- Watch out for other players trying to outbid you!

Remember, the larger your deposit, the more likely you are to become the manager and influence the game!
`;
const PROGRAM_ID = new web3.PublicKey('6JiDoZwQzjejMad35YLr9umaTR3t3LHW2inxCNyn2zV1');
const STAKE_POOL_ADDRESS = new web3.PublicKey('CCqmcJRXV1YVGfWnekHkx6UPcB87Xrb19jLc8omL6BXH');
const POOL_MINT = new web3.PublicKey('HVaXXXzaavwDT4zzVxgtbqquwCbo4zTCu5cq4aFpDQg4');
const RESERVE_STAKE = new web3.PublicKey('DisWUBE6svCH2rsGxg2FLK9YCiHjPLC7qkymiBubboWc');
const PROGRAM_STATE_SIZE = 32 + 8 + 8 + 8 + 8; // Pubkey + 3 u64s + discrim
const ButtonWithAnimation = ({ onClick, children }: { onClick: () => void, children: React.ReactNode }) => (
  <Button onClick={onClick} className={classes.button}>
    <span className={classes.buttonContent}>
      {children} <IconArrowRight size={16} />
    </span>
  </Button>
);

export function Landing() {
  const [program, setProgram] = useState<Program | null>(null);
  const [message, setMessage] = useState<any>('');
  const [depositAmount, setDepositAmount] = useState(0);
  const [feeType, setFeeType] = useState(0);
  const [feeAmount, setFeeAmount] = useState(0);
  const [feeDirection, setFeeDirection] = useState(true);
  const [minDepositAmount, setMinDepositAmount] = useState(0);
  const [minFeeAmount, setMinFeeAmount] = useState(0);
  const [minT22Amount, setMinT22Amount] = useState(0);
  const wallet = useWallet();
  const aWallet = useAnchorWallet()
  const [t22Amount, setT22Amount] = useState(0);
  const [lastDepositor, setLastDepositor] = useState<any>(null)
  const [t22Receiver, setT22Receiver] = useState<any>()
const [stakePool, setStakePool] = useState<splStakePool.StakePoolAccount | null>()
  useEffect(() => {
    const initializeProgram = async () => {
      if (wallet.publicKey && wallet.signTransaction) {
        const provider = new AnchorProvider(
          new web3.Connection("https://rpc.shyft.to?api_key=1y872euEMghE5flT"),
          aWallet as any,
          { commitment: 'processed' }
        );
        try {
          const idl = await Program.fetchIdl(PROGRAM_ID, provider)
          if (idl) {
            const program = new Program(idl as Idl, provider);
            setProgram(program);
            setMessage('Program initialized successfully.');
            const [statePubkey] = web3.PublicKey.findProgramAddressSync([Buffer.from('state')], program.programId);

            // @ts-ignore
            const stateAccount = await program.account.programState.fetch(statePubkey);
            console.log(stateAccount);
            const stakePool = await splStakePool.getStakePoolAccount(provider.connection, STAKE_POOL_ADDRESS)
            setStakePool(stakePool)
            const mintInfo = await getMint(provider.connection, POOL_MINT, 'confirmed', TOKEN_2022_PROGRAM_ID);
            const transferFeeConfig = getTransferFeeConfig(mintInfo);

            setT22Receiver(transferFeeConfig?.withdrawWithheldAuthority)
  
            setLastDepositor(stateAccount.lastDepositor);
            setMinDepositAmount((stateAccount.lastDepositAmount.toNumber()+(0.01*web3.LAMPORTS_PER_SOL)) / web3.LAMPORTS_PER_SOL);
            setMinFeeAmount((stateAccount.lastFeeAmount.toNumber()+(0.01*web3.LAMPORTS_PER_SOL)) / web3.LAMPORTS_PER_SOL);
            setMinT22Amount((stateAccount.lastT22Amount.toNumber()+(0.01*web3.LAMPORTS_PER_SOL)) / web3.LAMPORTS_PER_SOL);
            setInterval(async function(){
            // @ts-ignore
            const stateAccount = await program.account.programState.fetch(statePubkey);
            console.log(stateAccount);
            const stakePool = await splStakePool.getStakePoolAccount(provider.connection, STAKE_POOL_ADDRESS)
            setStakePool(stakePool)
            const mintInfo = await getMint(provider.connection, POOL_MINT, 'confirmed', TOKEN_2022_PROGRAM_ID);
            const transferFeeConfig = getTransferFeeConfig(mintInfo);

            setT22Receiver(transferFeeConfig?.withdrawWithheldAuthority)
  
            setLastDepositor(stateAccount.lastDepositor);
            setMinDepositAmount((stateAccount.lastDepositAmount.toNumber()+(0.01*web3.LAMPORTS_PER_SOL)) / web3.LAMPORTS_PER_SOL);
            setMinFeeAmount((stateAccount.lastFeeAmount.toNumber()+(0.01*web3.LAMPORTS_PER_SOL)) / web3.LAMPORTS_PER_SOL);
            setMinT22Amount((stateAccount.lastT22Amount.toNumber()+(0.01*web3.LAMPORTS_PER_SOL)) / web3.LAMPORTS_PER_SOL);
          }, 1000)
          }
        } catch (error) {
          console.error('Failed to fetch IDL:', error);
          setMessage('Failed to initialize program. Check console for details.');
        }
      }
    };

    initializeProgram();
  }, [wallet.publicKey, wallet.signTransaction]);

  const handleInitialize = async () => {
    if (!program) {
      setMessage('Program not initialized. Please connect your wallet.');
      return;
    }

    try {
      // @ts-ignore
      const tx = await program.methods.initialize().rpc({skipPreflight:true});  setMessage(
        <>
          Program initialized successfully. Transaction: {' '}
          <Anchor href={`https://solscan.io/tx/${tx}`} target="_blank" rel="noopener noreferrer">
            {tx}
          </Anchor>
        </>
      );
    } catch (error: any) {
      setMessage(`Initialization failed: ${error.message}`);
    }
  };

  const handleT22Fee = async () => {
    if (!program || !wallet.publicKey) {
      setMessage('Please connect your wallet and initialize the program first.');
      return;
    }

    try {
      // @ts-ignore
      const tx = await program.methods.setAuthority(new BN(t22Amount * web3.LAMPORTS_PER_SOL))
        .accounts({
          state: web3.PublicKey.findProgramAddressSync([Buffer.from('state')], program.programId)[0],
          stakePool: STAKE_POOL_ADDRESS,
          depositor: wallet.publicKey,
          
          stakePoolWithdrawAuthority: PublicKey.findProgramAddressSync(
            [STAKE_POOL_ADDRESS.toBuffer(), Buffer.from('withdraw')],
            new web3.PublicKey('SPoo1Ku8WFXoNDMHPsrGSTSG1Y47rzgn41SLUNakuHy')
          )[0],
         plainOldTokenProgram: TOKEN_PROGRAM_ID,
          reserveStakeAccount: RESERVE_STAKE,
          poolTokenReceiverAccount: getAssociatedTokenAddressSync(POOL_MINT, wallet.publicKey, true, TOKEN_2022_PROGRAM_ID),
          referrerFeeAccount: getAssociatedTokenAddressSync(POOL_MINT, wallet.publicKey, true, TOKEN_2022_PROGRAM_ID),
          poolMint: POOL_MINT,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: web3.SystemProgram.programId,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
          devAccount: new web3.PublicKey('99VXriv7RXJSypeJDBQtGRsak1n5o2NBzbtMXhHW2RNG'),
          stakePoolProgram: new web3.PublicKey('SPoo1Ku8WFXoNDMHPsrGSTSG1Y47rzgn41SLUNakuHy'),
          lastDepositor,
          
        })
        .rpc({skipPreflight:true});
      setMessage(
        <>
          T22 fee payment successful. Transaction: {' '}
          <Anchor href={`https://solscan.io/tx/${tx}`} target="_blank" rel="noopener noreferrer">
            {tx}
          </Anchor>
        </>
      );
    } catch (error: any) {
      setMessage(`T22 fee payment failed: ${error.message}`);
    }
  };

  const handleDeposit = async () => {
    if (!program || !wallet.publicKey) {
      setMessage('Please connect your wallet and initialize the program first.');
      return;
    }

    try {
      // @ts-ignore
      const tx = await program.methods.deposit(new BN(depositAmount * web3.LAMPORTS_PER_SOL))
        .accounts({
          state: web3.PublicKey.findProgramAddressSync([Buffer.from('state')], program.programId)[0],
          stakePool: STAKE_POOL_ADDRESS,
          stakePoolWithdrawAuthority: PublicKey.findProgramAddressSync(
            [STAKE_POOL_ADDRESS.toBuffer(), Buffer.from('withdraw')],
            new web3.PublicKey('SPoo1Ku8WFXoNDMHPsrGSTSG1Y47rzgn41SLUNakuHy')
          )[0],
          reserveStakeAccount: RESERVE_STAKE,
          depositor: wallet.publicKey,
          poolTokenReceiverAccount: getAssociatedTokenAddressSync(POOL_MINT, wallet.publicKey, true, TOKEN_2022_PROGRAM_ID),
          referrerFeeAccount: getAssociatedTokenAddressSync(POOL_MINT, wallet.publicKey, true, TOKEN_2022_PROGRAM_ID),

          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          poolMint: POOL_MINT,
          plainOldTokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: web3.SystemProgram.programId,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
          devAccount: new web3.PublicKey('99VXriv7RXJSypeJDBQtGRsak1n5o2NBzbtMXhHW2RNG'),
          stakePoolProgram: new web3.PublicKey('SPoo1Ku8WFXoNDMHPsrGSTSG1Y47rzgn41SLUNakuHy'),
          lastDepositor
        })
        .rpc({skipPreflight:true});
  // ... existing deposit code ...
  setMessage(
    <>
      Deposit successful. Transaction: {' '}
      <Anchor href={`https://solscan.io/tx/${tx}`} target="_blank" rel="noopener noreferrer">
        {tx}
      </Anchor>
    </>
  );
    } catch (error: any) {
      setMessage(`Deposit failed: ${error.message}`);
    }
  };

  const handleSetFee = async () => {
    if (!program || !wallet.publicKey) {
      setMessage('Please connect your wallet and initialize the program first.');
      return;
    }

    try {
      // @ts-ignore
      const tx = await program.methods.setFee(feeType, new BN(feeAmount * web3.LAMPORTS_PER_SOL), feeDirection)
        .accounts({
          state: web3.PublicKey.findProgramAddressSync([Buffer.from('state')], program.programId)[0],
          stakePool: STAKE_POOL_ADDRESS,
          stakePoolWithdrawAuthority: PublicKey.findProgramAddressSync(
            [STAKE_POOL_ADDRESS.toBuffer(), Buffer.from('withdraw')],
            new web3.PublicKey('SPoo1Ku8WFXoNDMHPsrGSTSG1Y47rzgn41SLUNakuHy')
          )[0],
          reserveStakeAccount: RESERVE_STAKE,
          depositor: wallet.publicKey,
          poolTokenReceiverAccount: getAssociatedTokenAddressSync(POOL_MINT, wallet.publicKey, true, TOKEN_2022_PROGRAM_ID),
          referrerFeeAccount: getAssociatedTokenAddressSync(POOL_MINT, wallet.publicKey, true, TOKEN_2022_PROGRAM_ID),

          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          poolMint: POOL_MINT,
          plainOldTokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: web3.SystemProgram.programId,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
          devAccount: new web3.PublicKey('99VXriv7RXJSypeJDBQtGRsak1n5o2NBzbtMXhHW2RNG'),
          stakePoolProgram: new web3.PublicKey('SPoo1Ku8WFXoNDMHPsrGSTSG1Y47rzgn41SLUNakuHy'),
          lastDepositor

        })
        .rpc({skipPreflight:true});
        setMessage(
          <>
            Fee set successfully. Transaction: {' '}
            <Anchor href={`https://solscan.io/tx/${tx}`} target="_blank" rel="noopener noreferrer">
              {tx}
            </Anchor>
          </>
        );
    } catch (error: any) {
      setMessage(`Setting fee failed: ${error.message}`);
    }
  };

  return (
    <Container size="xl" className={classes.container}>
      <Stack gap="md">
        <Title order={1} className={classes.title}>Fomo3d Stake Pool: The Ultimate DeFi Game</Title>
        
        <Accordion variant="separated">
          <Accordion.Item value="gameExplanation">
            <Accordion.Control>How to Play and Collect Fees</Accordion.Control>
            <Accordion.Panel>
              <Text>
                <h3>Welcome to Fomo3d Stake Pool - a DeFi game on Solana!</h3>

                <h4>How to play:</h4>
                <ol>
                  <li>Deposit SOL into the stake pool.</li>
                  <li>The last depositor becomes the pool manager.</li>
                  <li>As manager, you can adjust various fees:
                    <ul>
                      <li>SOL and Stake referral fees</li>
                      <li>Epoch fees</li>
                      <li>Deposit and withdrawal fees for both SOL and Stake</li>
                    </ul>
                  </li>
                  <li>Pay to adjust these fees and potentially earn more rewards.</li>
                  <li>The game continues as new players deposit and try to become the manager.</li>
                </ol>

                <h4>Strategy:</h4>
                <ul>
                  <li>Time your deposits to become the last depositor and gain control.</li>
                  <li>Adjust fees wisely to maximize your earnings while keeping the pool attractive.</li>
                  <li>Watch out for other players trying to outbid you!</li>
                </ul>

                <p><strong>Remember:</strong> The larger your deposit, the more likely you are to become the manager and influence the game!</p>

                <h4>Collecting Fees:</h4>
                <p>Go to fluxbeam.xyz and enter the CA {'{POOL_MINT}'} to collect your t22 withheld fees.</p>
              </Text>
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>
        
        <Box className={classes.gameboy}>
          <Stack gap="md" className={classes.screen}>
            <Text size="lg" className={classes.welcomeText}>
              Welcome to Fomo3d Stake Pool! Stake SOL, compete for prizes, and control the game's economy.
            </Text>
            
          <Group grow align="flex-end">
            <NumberInput
              label="T22 Fee Amount (SOL)"
              value={t22Amount !== 0 ? t22Amount : minT22Amount + 0.01}
              onChange={(value) => setT22Amount(Number(value))}
              min={minT22Amount}
              step={0.01}
              defaultValue={minT22Amount + 0.01}
              decimalScale={2}
              className={classes.input}
            />
            <ButtonWithAnimation onClick={handleT22Fee} >
              Pay T22 Fee
            </ButtonWithAnimation>
          </Group>
          
          <Group grow align="flex-end">
            <NumberInput
              label="Deposit Amount (SOL)"
              value={depositAmount !== 0 ? depositAmount : minDepositAmount + 0.01}
              onChange={(value) => setDepositAmount(Number(value))}
              min={minDepositAmount}
              step={0.01}
              defaultValue={minDepositAmount + 0.01}
              decimalScale={2}
              className={classes.input}
            />
            <ButtonWithAnimation onClick={handleDeposit} >
              Deposit
            </ButtonWithAnimation>
          </Group>
          
          <Group grow align="flex-end">
            <Select
              label="Fee Type"
              value={feeType.toString()}
              onChange={(value) => setFeeType(Number(value))}
              data={[
                { value: '0', label: 'SOL Referral Fee' },
                { value: '1', label: 'Stake Referral Fee' },
                { value: '2', label: 'Epoch Fee' },
                { value: '3', label: 'Stake Withdrawal Fee' },
                { value: '4', label: 'SOL Deposit Fee' },
                { value: '5', label: 'Stake Deposit Fee' },
                { value: '6', label: 'SOL Withdrawal Fee' }
              ]}
              className={classes.input}
            />
            <NumberInput
              label="Fee Amount (SOL)"
              value={feeAmount !== 0 ? feeAmount : minFeeAmount + 0.01}
              onChange={(value) => setFeeAmount(Number(value))}
              min={minFeeAmount}
              step={0.01}
              defaultValue={minFeeAmount + 0.01}
              decimalScale={2}
              className={classes.input}
            />
            <Stack>
              <Text>Fee Direction: {feeDirection ? 'Up' : 'Down'}</Text>
              <ButtonWithAnimation onClick={() => setFeeDirection(!feeDirection)} >
                Toggle
              </ButtonWithAnimation>
            </Stack>
          </Group>
          
          <ButtonWithAnimation onClick={handleSetFee}  >
            Set Fee
          </ButtonWithAnimation>
            <Stack gap="xs" className={classes.minValues}>
              <Text size="sm">Min deposit: {minDepositAmount.toFixed(2)} SOL</Text>
              <Text size="sm">Min fee: {minFeeAmount.toFixed(2)} SOL</Text>
              <Text size="sm">Min T22: {minT22Amount.toFixed(2)} SOL</Text>
            </Stack>
            
            {message && (
              <Alert color="blue" title="Message" className={classes.message}>
                {message}
              </Alert>
            )}
          </Stack>
        </Box>
        
      <Accordion variant="separated" className={classes.gameInfo} >
        <Accordion.Item value="gameInfo">
          <Accordion.Control>Game Info</Accordion.Control>
          <Accordion.Panel>
            <Stack gap="xs">
              <Group>
                <Text size="sm" fw="bold">Last Depositor:</Text>
                <Text size="sm">{lastDepositor ? lastDepositor.toBase58() : 'N/A'}</Text>
              </Group>
              <Group>
                <Text size="sm" fw="bold">T22 Fee Recipient:</Text>
                <Text size="sm">{t22Receiver ? t22Receiver.toBase58() : 'N/A'}</Text>
              </Group>
              <Group>
                <Text size="sm" fw="bold">Min Deposit:</Text>
                <Text size="sm">{minDepositAmount.toFixed(2)} SOL</Text>
              </Group>
              <Group>
                <Text size="sm" fw="bold">Min Fee:</Text>
                <Text size="sm">{minFeeAmount.toFixed(2)} SOL</Text>
              </Group>
              <Group>
                <Text size="sm" fw="bold">Min T22 Amount:</Text>
                <Text size="sm">{minT22Amount.toFixed(2)} SOL</Text>
              </Group>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </Stack>
  </Container>
  );
}