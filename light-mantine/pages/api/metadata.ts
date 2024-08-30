import { NextApiRequest, NextApiResponse } from 'next';
import { createCanvas, loadImage, registerFont } from 'canvas';
import { PublicKey, Connection } from '@solana/web3.js';
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import { getMint, getTransferFeeConfig, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';

const PROGRAM_ID = new PublicKey('6JiDoZwQzjejMad35YLr9umaTR3t3LHW2inxCNyn2zV1');
const STAKE_POOL_ADDRESS = new PublicKey('CCqmcJRXV1YVGfWnekHkx6UPcB87Xrb19jLc8omL6BXH');
const POOL_MINT = new PublicKey('HVaXXXzaavwDT4zzVxgtbqquwCbo4zTCu5cq4aFpDQg4');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const connection = new Connection("https://rpc.shyft.to?api_key=1y872euEMghE5flT");
  const provider = new AnchorProvider(connection, {} as any, { commitment: 'processed' });

  try {
    const idl = await Program.fetchIdl(PROGRAM_ID, provider);
    if (!idl) throw new Error('Failed to fetch IDL');

    const program = new Program(idl, provider);
    const [statePubkey] = PublicKey.findProgramAddressSync([Buffer.from('state')], program.programId);

    // @ts-ignore
    const stateAccount = await program.account.programState.fetch(statePubkey);

    const mintInfo = await getMint(connection, POOL_MINT, 'confirmed', TOKEN_2022_PROGRAM_ID);
    const transferFeeConfig = getTransferFeeConfig(mintInfo);

    const lastDepositor = stateAccount.lastDepositor.toString();
    const t22Receiver = transferFeeConfig?.withdrawWithheldAuthority?.toString() || 'N/A';
    const lastDepositAmount = (stateAccount.lastDepositAmount.toNumber() / 1e9).toFixed(2);
    const lastFeeAmount = (stateAccount.lastFeeAmount.toNumber() / 1e9).toFixed(2);
    const lastT22Amount = (stateAccount.lastT22Amount.toNumber() / 1e9).toFixed(2);

    // Generate the image
    const canvas = createCanvas(400, 400);
    const ctx = canvas.getContext('2d');

    // Load and register a retro-style font (you'll need to add this font to your project)
    registerFont('./pages/api/chunkfive-webfont.ttf', { family: 'RetroFont' });

    // Set background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 400, 400);

    // Set text style
    ctx.font = '16px RetroFont';
    ctx.fillStyle = '#00FF00';

    // Draw text
    ctx.fillText(`Last Depositor: ${lastDepositor.slice(0, 4)}...${lastDepositor.slice(-4)}`, 10, 30);
    ctx.fillText(`T22 Receiver: ${t22Receiver.slice(0, 4)}...${t22Receiver.slice(-4)}`, 10, 60);
    ctx.fillText(`Last Deposit: ${lastDepositAmount} SOL`, 10, 90);
    ctx.fillText(`Last Fee: ${lastFeeAmount} SOL`, 10, 120);
    ctx.fillText(`Last T22: ${lastT22Amount} SOL`, 10, 150);

    // Convert canvas to buffer
    const buffer = canvas.toBuffer('image/png');

    // Create dynamic description
    const description = `Risk-free Fomo3d on Solana - Last Depositor: ${lastDepositor.slice(0, 4)}...${lastDepositor.slice(-4)}, T22 Receiver: ${t22Receiver.slice(0, 4)}...${t22Receiver.slice(-4)}, Last Deposit: ${lastDepositAmount} SOL, Last Fee: ${lastFeeAmount} SOL, Last T22: ${lastT22Amount} SOL`;

    // Create metadata object
    const metadata = {
      name: "Fomo3d",
      symbol: "Fomo3d",
      description,
      image: `data:image/png;base64,${buffer.toString('base64')}`,
      tags: ["currency"],
      extensions: {
        description,
        twitter: "https://twitter.com/staccoverflow",
        website: "https://raisethedead.fun/riskfreefomo3d"
      }
    };

    res.status(200).json(metadata);
  } catch (error) {
    console.error('Error generating metadata:', error);
    res.status(500).json({ error: 'Failed to generate metadata' });
  }
}