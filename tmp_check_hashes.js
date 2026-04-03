
function getHashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
}

const codes = [
    "0xVB", "0xLO", "0xSM", "0xCA", "0xMI", "0xSC", "0xWI", "0xIN", 
    "0xCO", "0xCL", "0xFI", "0xCB", "0xNO", "0xLK", "0xRB", "0xWD", "0xES", "0xDS"
];

const results = codes.map(c => ({
    code: c,
    hashHex: "0x" + (getHashCode(c) >>> 0).toString(16),
    hashInt: getHashCode(c)
}));

console.log(JSON.stringify(results, null, 2));
