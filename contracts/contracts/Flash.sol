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


contract Flash is GelatoRelayContext {

    using SafeERC20 for IERC20;

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

    function pay(
        PaymentData calldata _paymentData,
        Signature calldata _signature
    ) external onlyGelatoRelay {
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
}
