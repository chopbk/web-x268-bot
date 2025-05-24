const calculateProfitAndLoss = (tradeConfig, balance = 0) => {
  let costAmount = tradeConfig.FIX_COST_AMOUNT;
  // if margin.mode == RATIO, get current balance and calculate costAmount
  if (tradeConfig.MARGIN?.MODE === "RATIO" && balance > 0) {
    costAmount =
      (balance * tradeConfig.MARGIN.RATIO) / tradeConfig.LONG_LEVERAGE;
  }

  const slPercent = tradeConfig?.SL?.SL_PERCENT;
  const volume = costAmount * tradeConfig.LONG_LEVERAGE;

  const loss = costAmount * slPercent;

  if (!tradeConfig?.TP?.PERCENT) return { total: 0, profit: "" };

  let profits = "";
  let count = 0,
    profit = 0,
    total = 0;
  let length = tradeConfig.TP.PERCENT.length;

  tradeConfig.TP.PERCENT.map((tp) => {
    count += 1;
    profit = costAmount * (tradeConfig.TP.CLOSE || 1) * tp;

    if (count === length) {
      profit = costAmount * tp;
    }
    profits += `TP${count} ${(tp * 100).toFixed(1)}% $${profit.toFixed(2)}`;
    if (count !== length) profits += "\n";
    costAmount = costAmount * (1 - (tradeConfig.TP.CLOSE || 0));
    total += profit;
  });

  return {
    total: total,
    profit: profits,
    loss: loss,
    volume: volume,
  };
};

function formatTradeConfig(tradeConfig, balance = 0) {
  if (!tradeConfig) return "Không có dữ liệu";
  let costAmount = tradeConfig.FIX_COST_AMOUNT;
  if (tradeConfig.MARGIN?.MODE === "RATIO" && balance > 0) {
    costAmount =
      (balance * tradeConfig.MARGIN.RATIO) / tradeConfig.LONG_LEVERAGE;
  }
  let { profit, total } = calculateProfitAndLoss(tradeConfig, balance);
  let msg = "";
  // ON
  msg += `\n⚙️on=${tradeConfig.ON} monitor=${tradeConfig.MONITOR} trailing=${tradeConfig.TRAILING?.ON} paper=${tradeConfig.PAPER}\n🟢 long=${tradeConfig.LONG} short=${tradeConfig.SHORT} invert=${tradeConfig.INVERT} autoconfig=${tradeConfig.AUTO_CONFIG} mark=${tradeConfig.OPEN?.MARK}`;
  // VOLUME
  msg += `\n🟢longlevel=${tradeConfig.LONG_LEVERAGE}X  🛑 shortlevel=${
    tradeConfig.SHORT_LEVERAGE
  }X \n💵cost=${costAmount}$ volume=${(
    costAmount * tradeConfig.LONG_LEVERAGE
  ).toFixed(1)}$ margin.mode=${tradeConfig.MARGIN?.MODE} margin.ratio=${
    tradeConfig.MARGIN?.RATIO
  }`;
  // PROFIT
  msg += `\n✅tp=${tradeConfig.TP?.PERCENT} 🎯close=${
    tradeConfig.TP?.CLOSE
  } \n🏆total-profit = ${(total || 0).toFixed(2)}$ tp_type=${
    tradeConfig.TP?.TYPE
  } tp_time=${tradeConfig.TP?.TIME}s report_profit=${
    tradeConfig.REPORT_PROFIT
  }`;
  // STOPLOSS
  msg += `\n❌sl=${tradeConfig.SL?.SL_PERCENT}💦${(
    (tradeConfig.SL?.SL_PERCENT || 0) * costAmount
  ).toFixed(2)}$ sli=${tradeConfig.SL?.SLI_PERCENT}🆘sl2=${
    tradeConfig.SL?.SL2_PERCENT
  }💦${((tradeConfig.SL?.SL2_PERCENT || 0) * costAmount).toFixed(
    2
  )}$\n📌sl_time=${tradeConfig.SL?.SL_TIME}s sl_type=${tradeConfig.SL?.TYPE}${
    tradeConfig.SL?.TYPE === "CANDLE" ? `_${tradeConfig.SL?.SL_CANDLE}` : ""
  } max_loss=${tradeConfig.SL?.MAX_LOSS}$ `;
  // MONITOR
  msg += `\n🔔trailing_type:${tradeConfig.TRAILING?.TYPE} sptrigger=${tradeConfig.TRAILING?.TRIGGER_PERCENT} sp=${tradeConfig.TRAILING?.SP_PERCENT} r=${tradeConfig.TRAILING?.R_PERCENT}\n🔥hp=${tradeConfig.HP?.ON} hptrigger=${tradeConfig.HP?.HP_PERCENT_TRIGGER} rhsl=${tradeConfig.HP?.RHSL_PERCENT} rh=${tradeConfig.HP?.RH_PERCENT}`;
  // OPEN
  msg += `\n📤open_type=${tradeConfig.OPEN?.TYPE} spread=${(
    (tradeConfig.OPEN?.SPREAD || 0) * 100
  ).toFixed(2)}% wait=${tradeConfig.OPEN?.WAIT}m risk=${
    tradeConfig.OPEN?.RISK
  } max_position=${tradeConfig.OPEN?.MAX_POSITION}`;
  // COPY
  msg += `\n©️copy=${tradeConfig.COPY?.ON} max_volume=${
    tradeConfig.COPY?.MAX_VOLUME
  }$ rate=${((tradeConfig.COPY?.RATE || 0) * 100).toFixed(2)}%\n💸fix_cost: ${
    tradeConfig.COPY?.FIX
  } dca: ${tradeConfig.COPY?.DCA} follow: ${tradeConfig.COPY?.FOLLOW}`;
  return msg;
}

export { formatTradeConfig, calculateProfitAndLoss };
