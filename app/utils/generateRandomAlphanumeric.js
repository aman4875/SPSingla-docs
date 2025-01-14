function generateAlphaNumericSuffix() {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    const digits = '0123456789';
    
    // Generate 2 random letters
    let alphaPart = '';
    for (let i = 0; i < 2; i++) {
        alphaPart += letters.charAt(Math.floor(Math.random() * letters.length));
    }

    // Generate 5 random digits
    let numericPart = '';
    for (let i = 0; i < 5; i++) {
        numericPart += digits.charAt(Math.floor(Math.random() * digits.length));
    }

    return `${alphaPart}${numericPart}`;
}

module.exports = generateAlphaNumericSuffix