// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import {
    GelatoRelayContext
} from "@gelatonetwork/relay-context/contracts/GelatoRelayContext.sol";

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";
import {
    SafeERC20
} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";


contract Flash is GelatoRelayContext, EIP712 {

    using SafeERC20 for IERC20;

    bytes32 private constant _PERMIT_TYPEHASH =
        keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)");

    bytes32 public constant PAY_TYPEHASH =
        keccak256("Pay(address receiver,bytes32 permitHash)");

    struct Signature {
        uint8 v;
        bytes32 r;
        bytes32 s;
    }
    struct PermitData {
        uint256 deadline;
        Signature signature;
    }

    struct PaymentData {
        address token;
        address from;
        address to;
        uint256 amount;
        PermitData permitData;
    }

    constructor() EIP712("Flash", "1") {}

    function pay(
        PaymentData calldata _paymentData,
        Signature calldata _signature
    ) external onlyGelatoRelay {

        _verifySignature(_paymentData, _signature);

        IERC20Permit(_paymentData.token).permit(
            _paymentData.from,
            address(this),
            _paymentData.amount,
            _paymentData.permitData.deadline,
            _paymentData.permitData.signature.v,
            _paymentData.permitData.signature.r,
            _paymentData.permitData.signature.s
        );

        IERC20(_paymentData.token).safeTransferFrom(
            _paymentData.from,
            address(this),
            _paymentData.amount
        );

        _transferRelayFee();

        SafeERC20.safeTransfer(
            IERC20(_paymentData.token),
            _paymentData.to,
            IERC20(_paymentData.token).balanceOf(address(this))
        );

    }

    function _verifySignature(
        PaymentData calldata _paymentData,
        Signature calldata _signature
    ) internal {
        uint256 userNonce = IERC20Permit(_paymentData.token).nonces(_paymentData.from);
        bytes32 permitStructHash = keccak256(abi.encode(
            _PERMIT_TYPEHASH,
            _paymentData.from,
            address(this),
            _paymentData.amount,
            userNonce,
            _paymentData.permitData.deadline
        ));

        bytes32 paymentStructHash = keccak256(abi.encode(
            PAY_TYPEHASH,
            _paymentData.to,
            permitStructHash
        ));
        bytes32 hash = _hashTypedDataV4(paymentStructHash);
        address signer = ECDSA.recover(hash, _signature.v, _signature.r, _signature.s);
        require(signer == _paymentData.from, "Flash: invalid signature");
    }

}
