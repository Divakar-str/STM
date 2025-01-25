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
    'athirstam': [1, 3, 5, 6, 9, 10, 14, 15, 16, 18, 21, 23, 24, 27, 32, 33, 36, 42, 46, 50, 51],
    'thuraathirstam': [4, 7, 8, 11, 13, 17, 22, 28, 31, 40, 49, 58],
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
    let matchCount = 0;

    for (let num = minValue; num <= maxValue; num++) {
        const digitSum = Array.from(num.toString()).reduce((total, digit) => total + parseInt(digit), 0);
        const totalSum = predefinedSum + digitSum;

        const reducedTotalSum = reduceToSingleDigit(totalSum);
        const reducedDigitSum = reduceToSingleDigit(digitSum);

        if (selectedList.includes(reducedTotalSum) && selectedList.includes(reducedDigitSum)) {
            const formattedNum = num.toString().padStart(4, '0');
            // Set background color based on whether the number is "fancy"
            const bgColor = fancy.includes(num) ? '#FFD700' : '#FFFFFF'; // Fancy numbers get gold background

            const span = document.createElement('span');
            span.classList.add('col-md-2', 'code-container', 'output-number');
            span.style.backgroundColor = bgColor;
            span.innerText = `TN52AD${formattedNum}`;
            outputContainer.appendChild(span);
            matchCount++;
        }
    }

    
}


function printNumbersfull() {
    var output = document.getElementById('outputResults').innerHTML;

    if (!output.trim()) {
        alert("No results to print.");
        return;
    }

    var printWindow = window.open('', '', 'height=600,width=800');
    printWindow.document.write('<html><head><title>Print Numbers</title>');
    printWindow.document.write('<link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0/css/bootstrap.min.css">');
    printWindow.document.write('<style>');
    
    // Custom styles for the output container and number boxes
    printWindow.document.write(`
        .output-container {
            border: 1px solid #ccc;
            padding: 20px;
            display: grid;
            grid-gap: 10px;
            background-color: #f2f2f2;
        }

        .output-number {
            display: flex;
            justify-content: center;
            align-items: center;
            min-width: 103px;
            height: 40px;
            border: 1px solid #ddd;
            border-radius: 5px;
            padding: 10px;
            box-sizing: border-box;
            background-color: #ffffff;
            overflow: hidden;
            white-space: nowrap;
            text-overflow: ellipsis;
            font-size: 22px;
        }

        /* Responsive grid layout */
        @media (min-width: 1200px) { .output-container { grid-template-columns: repeat(6, 1fr); } }
        @media (min-width: 992px) and (max-width: 1199px) { .output-container { grid-template-columns: repeat(5, 1fr); } }
        @media (min-width: 768px) and (max-width: 991px) { .output-container { grid-template-columns: repeat(4, 1fr); } }
        @media (max-width: 767px) { .output-container { grid-template-columns: repeat(2, 1fr); } }

        /* Print-specific layout for A4 */
        @media print {
            @page {
                size: A4;
                margin: 10mm;
            }
            .output-container {
                grid-template-columns: repeat(6, 1fr) !important;
                grid-gap: 5px;
            }
            .output-number {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
                font-weight: bolder;
            }
        }
    `);

    printWindow.document.write('</style>');
    printWindow.document.write('</head><body>');
    printWindow.document.write('<div class="container"><div class="output-container">' + output + '</div></div>');
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    
    printWindow.print();
}
