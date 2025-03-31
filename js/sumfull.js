const charToNumber = {
    'A': 1, 'I': 1, 'J': 1, 'Q': 1, 'Y': 1,
    'B': 2, 'K': 2, 'R': 2,
    'C': 3, 'G': 3, 'L': 3, 'S': 3,
    'D': 4, 'M': 4, 'T': 4,
    'E': 5, 'N': 5, 'X': 5,
    'U': 6, 'V': 6, 'W': 6,
    'O': 7, 'Z': 7,
    'F': 8, 'P': 8
};

const lists = {
    'migaathirstam': [19, 23, 37, 41, 45],
    'athirstam': [1, 3, 5, 6, 9, 10, 14, 15, 16, 18, 21, 23, 24, 27,28, 32, 33, 36, 42, 46, 50, 51],
    'thuraathirstam': [4, 7, 8, 11, 13, 17, 22, 31, 40, 49, 58],
    'aathiryaialipathu': [20, 55],
    'sothanai': [25, 34, 43, 47],
    'sumar': [2, 12, 30, 38, 39, 48, 54, 56, 57],
    'aapathu': [20, 26, 29, 35, 44, 53],
    'aamatram': [52]
};

function calculateCharSum(inputStr) {
    return Array.from(inputStr).reduce((total, character) => {
        return total + (charToNumber[character] || parseInt(character) || 0);
    }, 0);
}

function reduceToSingleDigit(number) {
    while (number > 9) {
        number = Array.from(number.toString()).reduce((total, digit) => total + parseInt(digit), 0);
    }
    return number;
}

function processSumMatching() {
    const prefix = document.getElementById('prefixInput').value.toUpperCase();
    const additionalPrefix = document.getElementById('additionalPrefixInput').value.toUpperCase();
    const minValue = parseInt(document.getElementById('minValueInput').value);
    const maxValue = parseInt(document.getElementById('maxValueInput').value);
    const selectedListName = document.getElementById('listSelector').value;
    const selectedList = lists[selectedListName];

    if (!selectedList) {
        document.getElementById('outputResults').innerText = 'Selected list not found.';
        return;
    }

    const predefinedSum = calculateCharSum(prefix) + calculateCharSum(additionalPrefix);

    const outputContainer = document.getElementById('outputResults');
    outputContainer.innerHTML = ''; // Clear previous results
    let matchingNumbers = [];

    for (let num = minValue; num <= maxValue; num++) {
        const digitSum = Array.from(num.toString()).reduce((total, digit) => total + parseInt(digit), 0);
        const totalSum = predefinedSum + digitSum;

        const reducedTotalSum = reduceToSingleDigit(totalSum);
        const reducedDigitSum = reduceToSingleDigit(digitSum);

        if (selectedList.includes(reducedTotalSum) && selectedList.includes(reducedDigitSum)) {
            const formattedNum = num.toString().padStart(4, '0');
            // Set background color based on whether the number is "fancy"
            matchingNumbers.push({ number: `TN52AD${formattedNum}`, originalNumber: num });
        }
    }

    if (matchingNumbers.length === 0) {
        outputContainer.innerHTML = "<p>No matching numbers found.</p>";
        return;
    }

    // Creating a structured table layout dynamically
    let columns = Math.min(5, Math.ceil(Math.sqrt(matchingNumbers.length)));
    let rows = Math.ceil(matchingNumbers.length / columns);

    let tableHTML = "<table class='fancy-table' style='width: 100%; border-collapse: collapse;'>";
    for (let i = 0; i < rows; i++) {
        tableHTML += "<tr>";
        for (let j = 0; j < columns; j++) {
            let index = i * columns + j;
            if (index < matchingNumbers.length) {
                const { number, originalNumber } = matchingNumbers[index];
                let isFancy = fancy.includes(originalNumber); // Check if it's fancy
                tableHTML += `<td class='${isFancy ? "fancy" : ""}' style='padding: 10px; text-align: center; border: 1px solid #000;'>${number}</td>`;
            } else {
                tableHTML += "<td></td>";
            }
        }
        tableHTML += "</tr>";
    }
    tableHTML += "</table>";

    outputContainer.innerHTML = tableHTML;
}




function printNumbersfull() {
    var resultDiv = document.getElementById('outputResults');

    // Get the HTML content of the resultDiv
    var resultHTML = resultDiv.innerHTML;

    let printWindow = window.open('', '', 'height=600,width=800');
    printWindow.document.write(`
        <html>
        <head>
            <title>Print Numbers</title>
            <style>
                body { font-family: Arial, sans-serif; text-align: center; }
                table { width: 100%; border-collapse: collapse; border: 1px solid black; }
                td { border: 1px solid black; padding: 10px; text-align: center; font-size: 18px; }
                .fancy { background-color: #FFD700 !important; font-weight: bold; }
                @media print { 
                    @page { size: A4; margin: 10mm; } 
                    .fancy { 
                        background-color: #FFD700 !important; 
                        font-weight: bold; 
                        -webkit-print-color-adjust: exact; /* Ensure color prints */
                    }
                }
            </style>
        </head>
        <body>
            ${resultHTML}
        </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
}

