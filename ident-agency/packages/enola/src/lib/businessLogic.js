import BigNumber from 'bignumber.js';

export const MINIMUM_PAYMENT_AMOUNT = 20; // 20 drops = 0.00002 XRP

export const calculateFeeForEscrow = (tx) => {
	// given a tx amount, calculate any processing fees, etc.

	// tx.feesPaid is the amount we paid to complete the escrow and it should be subtracted from the amount

	if (!tx || !tx.amount) {
		throw new Error('calculateFeeForEscrow: tx and amount is required');
	}

	// tx.amount is in drops
	let total = BigNumber(tx.amount).minus(tx.feesPaid || 0); // subtract any existing fees paid

	let amount = total.multipliedBy(1 - 0.02); // 2% of amount stays as a fee

	// validate that amount is < total
	if (amount.isGreaterThan(total)) {
		throw new Error('calculateFeeForEscrow: amount is greater than total');
	}

	// round down
	amount = amount.integerValue(BigNumber.ROUND_DOWN);

	const fee = total.minus(amount);

	return {
		amount: amount.toString(),
		fee: fee.toString(),
		escrowFees: tx.feesPaid || 0
	};
};
