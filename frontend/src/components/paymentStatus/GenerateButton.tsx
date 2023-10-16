"use client";
import { ethers } from "ethers";
import { getPermitSignature, validatePermit } from "../../utils";
import { useRouter } from "next/navigation";
import { useContext, useEffect, useState } from "react";
import { Web3AuthContext } from "@/context/Web3AuthContext";
import { Button } from "@/components/ui/button";
import { FaSpinner } from "react-icons/fa";
import { getGnosisSdk } from "@dethcrypto/eth-sdk-client";

function GeneratePaymentCodeButton({
    address,
    amount,
    paymentId,
}: {
    address: string;
    amount: string;
    paymentId: string;
}) {
    const router = useRouter();
    const web3AuthContext = useContext(Web3AuthContext);
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState<string | undefined>(undefined);

    useEffect(() => {
        const init = async () => {
            setProcessing(true);
            const signer = web3AuthContext?.ethersSigner;
            if (!signer) {
                console.error("Getting user signer failed");
                setError("Getting user signer failed");
                setProcessing(false);
                return;
            }
            const sdk = getGnosisSdk(signer);
            const userAddress = await signer.getAddress();
            const balance = await sdk.usdc.balanceOf(userAddress);
            const value = ethers.utils.parseUnits(amount, 6);
            if (balance.lt(value)) {
                console.warn("insufficient balance");
                setError("Insufficient Balance");
            }
            setProcessing(false);
        };
        init();
    });

    async function generateSignature() {
        setProcessing(true);
        const value = ethers.utils.parseUnits(amount, 6);
        const rpcUrl = "https://rpc.gnosischain.com/";
        const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
        const blockNumber = await provider.getBlockNumber();

        console.log("blockNumber:", blockNumber);

        const signer = web3AuthContext?.ethersSigner;
        console.log("signer:", signer);
        if (!signer) {
            console.warn("no signer");
            return;
        }

        const result = await getPermitSignature(signer, value, 10000);
        console.log("result:", result);
        try {
            await validatePermit(
                result.sender,
                value,
                result.deadline ?? 0,
                result.r,
                result.s,
                result.v
            );
            let qr = `deadline=${result.deadline}&r=${result.r}&s=${result.s}&v=${result.v}&sender=${result.sender}&amount=${amount}&address=${address}&paymentId=${paymentId}`;
            console.log("qr:", qr);
            let targetUrl = `dapp/paymentStatus?${qr}`;
            console.log("targetUrl:", targetUrl);
            router.push(targetUrl);
        } catch (e) {
            console.log("validationError:", e);
            setProcessing(false);
            return;
        }
    }

    if (error) {
        return (
            <>
                <Button disabled>{error}</Button>
            </>
        );
    }

    if (processing) {
        return (
            <>
                <div>
                    <Button disabled>
                        <FaSpinner className="animate-spin inline-block" />{" "}
                        Processing
                    </Button>
                </div>
            </>
        );
    }
    return (
        <>
            <div>
                <Button onClick={generateSignature}>Send Payment</Button>
            </div>
        </>
    );
}

export default GeneratePaymentCodeButton;
