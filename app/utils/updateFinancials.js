const Decimal = require("decimal.js");

function parseDDMMYYYY(dateStr) {
  const [dd, mm, yyyy] = dateStr.split("/");
  return new Date(Number(yyyy), Number(mm) - 1, Number(dd));
}

function calculateAccountInterest(principal, annualRatePercent, startDateStr) {
  principal = Number(principal);
  annualRatePercent = Number(annualRatePercent);

  const now = new Date();
  const startDate = parseDDMMYYYY(startDateStr);

  const msInDay = 1000 * 60 * 60 * 24;
  const diffMs = now.getTime() - startDate.getTime();
  const diffDays = new Decimal(diffMs).div(msInDay);
  if (diffDays.lte(0)) return "0.00";

  const principalDecimal = new Decimal(principal);
  const rateDecimal = new Decimal(annualRatePercent).div(100);

  const interest = principalDecimal.mul(rateDecimal).div(365).mul(diffDays);
  return interest.toFixed(2);
}

function calculateTDS(accruedInterest, tdsRate = 10.0) {
  accruedInterest = Number(accruedInterest);
  tdsRate = Number(tdsRate);
  if (isNaN(accruedInterest) || accruedInterest <= 0) return "0.00";
  const tdsAmount = (tdsRate / 100) * accruedInterest;
  return tdsAmount.toFixed(2);
}

function calculateMarginAvailable(renewalAmount, accruedInterest, tdsAmount) {
  renewalAmount = Number(renewalAmount);
  accruedInterest = Number(accruedInterest);
  tdsAmount = Number(tdsAmount);
  if (isNaN(renewalAmount) || renewalAmount <= 0 || isNaN(tdsAmount))
    return "0.00";
  const netInterest = accruedInterest - tdsAmount;
  const marginAvailable = renewalAmount + netInterest;
  return marginAvailable.toFixed(2);
}

module.exports = (principal, annualRatePercent, startDateStr, tdsRate) => {
  
  const interest = calculateAccountInterest(
    principal,
    annualRatePercent,
    startDateStr
  );

  const tds = calculateTDS(interest, tdsRate);
  const marginAvailable = calculateMarginAvailable(principal, interest, tds);

  return {
    interest,
    tds,
    marginAvailable,
  };
};
