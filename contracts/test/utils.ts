import { ethers } from "hardhat";
import { BigNumberish, Signer } from "ethers";
import { Flash, IERC20Complete } from "../typechain-types";

export async function getTokenPermitSignature(
    token: IERC20Complete,
    spender: string,
    value: BigNumberish,
    deadline: BigNumberish
) {
    const owner = await token.signer.getAddress();
    const [nonce, tokenName, tokenVersion] = await Promise.all([
        token.nonces(owner),
        token.name(),
        "1",
    ]);
    console.log({ nonce, name: tokenName, version: tokenVersion });
    const { chainId } = (await token.provider.getNetwork()) ?? {
        chainId: -1,
    };

    const permitDomain = {
        name: tokenName,
        version: tokenVersion,
        chainId,
        verifyingContract: token.address,
    };
    const permitTypes = {
        Permit: [
            {
                name: "owner",
                type: "address",
            },
            {
                name: "spender",
                type: "address",
            },
            {
                name: "value",
                type: "uint256",
            },
            {
                name: "nonce",
                type: "uint256",
            },
            {
                name: "deadline",
                type: "uint256",
            },
        ],
    };

    const permitValues = {
        owner,
        spender,
        value,
        nonce,
        deadline,
    };

    const typedSignature = await token.signer._signTypedData(
        permitDomain,
        permitTypes,
        permitValues
    );
    console.log("typedSignature", typedSignature);
    const signature = ethers.utils.splitSignature(typedSignature);

    return {
        permitNonce: nonce,
        permitSignature: {
            v: signature.v,
            r: signature.r,
            s: signature.s,
            deadline,
        },
    };
}

export async function generatePaySignature(
    permitNonce: BigNumberish,
    receiver: string,
    signer: Signer,
    flash: Flash
) {
    const { chainId } = (await signer.provider?.getNetwork()) ?? {
        chainId: -1,
    };

    const payDomain = {
        name: "Flash",
        version: "1",
        chainId,
        verifyingContract: flash.address,
    };
    const payTypes = {
        Pay: [
            {
                name: "receiver",
                type: "address",
            },
            {
                name: "permitNonce",
                type: "uint256",
            },
        ],
    };

    const payValues = {
        receiver,
        permitNonce,
    };

    const typedSignature = await flash.signer._signTypedData(
        payDomain,
        payTypes,
        payValues
    );
    console.log("typedSignature", typedSignature);
    const signature = ethers.utils.splitSignature(typedSignature);

    return {
        v: signature.v,
        r: signature.r,
        s: signature.s,
    };
}

export async function generatePaymentStructs(
    token: IERC20Complete,
    amount: BigNumberish,
    deadline: BigNumberish,
    receiverAddress: string,
    flash: Flash
) {
    const { permitSignature, permitNonce } = await getTokenPermitSignature(
        token,
        flash.address,
        amount,
        deadline
    );

    const paySignature = await generatePaySignature(
        permitNonce,
        receiverAddress,
        token.signer,
        flash
    );
    console.log("paySignature", paySignature);

    const permitData = {
        deadline,
        signature: permitSignature,
    };

    const paymentData = {
        token: token.address,
        from: await flash.signer.getAddress(),
        to: receiverAddress,
        amount,
        permitData,
    };
    return {
        paymentData,
        paySignature,
    };
}

export async function generateVerificationCallData(
    token: IERC20Complete,
    amount: BigNumberish,
    deadline: BigNumberish,
    receiverAddress: string,
    flash: Flash
) {
    const { paymentData, paySignature } = await generatePaymentStructs(
        token,
        amount,
        deadline,
        receiverAddress,
        flash
    );

    const verifyDataCallData = flash.interface.encodeFunctionData(
        "verifyData",
        [paymentData, paySignature]
    );
    return verifyDataCallData;
}

export async function generatePayCallData(
    verifyCallData: string,
    tokenAddress: string,
    amount: BigNumberish,
    receiver: string,
    flash: Flash
) {
    const result = await flash.signer.provider?.call({
        to: flash.address,
        data: verifyCallData,
    });
    const expectedResult =
        "0x0000000000000000000000000000000000000000000000000000000000000001";
    if (result !== expectedResult) {
        console.log("result", result);
        throw new Error("verifyData failed");
    }

    const [paymentData, paySignature] = flash.interface.decodeFunctionData(
        "verifyData",
        verifyCallData
    );

    console.log("paymentData", paymentData);
    if (paymentData.token !== tokenAddress) {
        throw new Error("token address mismatch");
    }

    if (!paymentData.amount.eq(amount)) {
        throw new Error("amount mismatch");
    }

    if (paymentData.to !== receiver) {
        throw new Error("receiver mismatch");
    }

    const payCallData = flash.interface.encodeFunctionData("pay", [
        paymentData,
        paySignature,
    ]);
    console.log("payCallData", payCallData);
    return payCallData;
}
