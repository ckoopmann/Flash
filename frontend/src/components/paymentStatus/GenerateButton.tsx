"use client";
import { ethers } from "ethers";
import { generateVerificationCallData, generatePayCallData} from "../../utils";
import { useRouter } from "next/navigation";
import { useContext, useEffect, useState } from "react";
import { Web3AuthContext } from "@/context/Web3AuthContext";
import { Button } from "@/components/ui/button";
import { FaSpinner } from "react-icons/fa";
import { getGnosisSdk } from "@dethcrypto/eth-sdk-client";

const RELATIVE_DEADLINE = 60*60;

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

    async function generateCalldata() {
        setProcessing(true);
        const value = ethers.utils.parseUnits(amount, 6);
        const signer = web3AuthContext?.ethersSigner;
        console.log("signer:", signer);
        if (!signer) {
            console.warn("no signer");
            return;
        }

        const sdk = getGnosisSdk(signer);

        const deadline = Math.floor(Date.now() / 1000) + RELATIVE_DEADLINE;
        const verificationCalldata = await generateVerificationCallData(
            sdk.usdc,
            value,
            deadline,
            address,
            sdk.flash
        );
        console.log("verificationCalldata:", verificationCalldata);
        try {
            const payCalldata = await generatePayCallData(verificationCalldata,
                sdk.usdc.address,
                value,
                address, 
                sdk.flash
            );
            let qr = `calldata=${payCalldata}&paymentId=${paymentId}`;
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
                <Button onClick={generateCalldata}>Send Payment</Button>
            </div>
        </>
    );
}

export default GeneratePaymentCodeButton;
