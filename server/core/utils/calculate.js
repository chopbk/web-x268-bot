const getPrecision = function (tickSize) {
    if (!isFinite(tickSize)) return 0;
    var e = 1,
        p = 0;
    while (Math.round(tickSize * e) / e !== tickSize) {
        e *= 10;
        p++;
    }
    return p;
};
const scientificToDecimal = (num) => {
    if (/\d+\.?\d*e[\+\-]*\d+/i.test(num)) {
        const zero = "0";
        const parts = String(num).toLowerCase().split("e"); // split into coeff and exponent
        const e = parts.pop(); // store the exponential part
        const l = Math.abs(e); // get the number of zeros
        const sign = e / l;
        const coeff_array = parts[0].split(".");
        if (sign === -1) {
            num = zero + "." + new Array(l).join(zero) + coeff_array.join("");
        } else {
            const dec = coeff_array[1];
            if (dec) {
                l = l - dec.length;
            }
            num = coeff_array.join("") + new Array(l + 1).join(zero);
        }
    } else {
        // make sure we always cast to string
        num = num + "";
    }

    return num;
};
const round = function (amount, tickSize) {
    var precision = 100000000;
    var t = getPrecision(tickSize);

    if (Number.isInteger(t)) precision = Math.pow(10, t);

    amount *= precision;
    amount = Math.floor(amount);
    amount /= precision;

    // https://gist.github.com/jiggzson/b5f489af9ad931e3d186
    amount = scientificToDecimal(amount);

    return parseFloat(amount);
};
const roundAmount = function (amount, stepSize) {
    return round(amount, stepSize);
};
const roundPrice = function (price, tickSize) {
    return round(price, tickSize);
};
function parsePriceWithTickSize(price, tickSize, currentPrice) {
    const numericPrice = parseFloat(price);
    if (isNaN(numericPrice)) return null;

    // Tính số chữ số thập phân của tickSize
    const tickSizeDecimals = tickSize.toString().split(".")[1]?.length || 0;

    // Tính số chữ số thập phân của giá hiện tại
    const currentPriceDecimals = currentPrice.toString().split(".")[1]?.length || 0;

    // Tính số chữ số thập phân của giá trong tin nhắn
    const messagePriceDecimals = numericPrice.toString().split(".")[1]?.length || 0;

    // Nếu giá trong tin nhắn không có số thập phân
    if (messagePriceDecimals === 0) {
        // Nếu giá trong tin nhắn lớn hơn giá hiện tại
        if (numericPrice > currentPrice) {
            // Tính hệ số nhân dựa trên số chữ số thập phân của tickSize
            const multiplier = Math.pow(10, tickSizeDecimals);
            return roundPrice(numericPrice / multiplier, tickSize);
        }
    }

    // Nếu không, giữ nguyên giá
    return roundPrice(numericPrice, tickSize);
}
module.exports = {
    roundAmount,
    roundPrice,
    round,
    parsePriceWithTickSize,
};
