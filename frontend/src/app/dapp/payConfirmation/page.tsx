"use client";
import { TextField } from "@mui/material";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import GeneratePaymentCodeButton from "@/components/paymentStatus/GenerateButton"
import { getGnosisSdk } from "@dethcrypto/eth-sdk-client";
import { ethers } from "ethers";

import { useWeb3Auth } from "@/provider/Web3AuthProvider";

function PayConfirmation() {
    const web3AuthContext = useWeb3Auth();
    const searchParams = useSearchParams();
    const address = searchParams.get("address") ?? "";
    const amount = searchParams.get("amount") ?? "";
    const paymentId = searchParams.get("paymentId") ?? "";
    const [amountUSD, setAmountUSD] = useState("");

    useEffect(() => {
        const init = async () => {
            const signer = web3AuthContext?.ethersSigner;
            if (!signer) {
                console.error("Getting user signer failed");
                return;
            }
            const sdk = getGnosisSdk(signer);
            const amountUSDCalculated = await sdk.sdai.previewRedeem(
                ethers.utils.parseEther(amount)
            );
            console.log("amountUSDCalculated:", ethers.utils.formatEther(amountUSDCalculated));
            setAmountUSD(parseFloat(ethers.utils.formatEther(amountUSDCalculated)).toFixed(2).toString());
        };
        init();
    }, []);


    return (
        <main className="flex min-h-screen items-center justify-center">
            <div>
                <span>Confirm Payment</span>

                <div style={{ marginTop: 30 }}>
                    <TextField
                        style={{ width: 320 }}
                        value={amountUSD}
                        label="Amount (USD)"
                        size="medium"
                        variant="outlined"
                        color="primary"
                        disabled
                    />
                </div>

                <GeneratePaymentCodeButton
                    address={address}
                    amount={amount}
                    paymentId={paymentId}
                />

            </div>
        </main>
    );
}

export default PayConfirmation;
