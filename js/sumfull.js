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

    const fancy = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 22, 33, 44, 55, 66, 77, 88, 99, 100, 101, 123, 222, 234, 333, 
        345, 444, 456, 555, 567, 666, 678, 777, 786, 789, 888, 999, 1000, 1001, 1212, 1234, 1988, 1990, 2000, 
        2002, 2020, 2121, 2222, 2345, 2525, 2626, 2727, 2728, 3000, 3003, 3030, 3333, 3456, 4000, 4004, 4040, 4444, 
        4567, 4777, 5000, 5005, 5050, 5555, 6000, 6006, 6060, 6666, 6789, 7000, 7007, 7070, 7171, 7172, 7337, 7575, 7576,
        7777, 8000, 8118, 8181, 8448, 8484, 8586, 8888, 9000, 9009, 9090, 9091, 9097, 9779, 9797, 9999];

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

    if (matchCount === 0) {
        outputContainer.innerText = `No matches found.\n\nTotal Sum: ${predefinedSum}`;
    } else {
        const totalMatches = document.createElement('div');
        totalMatches.innerText = `Total matches: ${matchCount}`;
        outputContainer.appendChild(totalMatches);
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
    
    // Default styles for the output container
    printWindow.document.write('.output-container { border: 1px solid #ccc; padding: 20px; display: grid; grid-gap: 10px; }');
    printWindow.document.write('.output-number { padding: 5px; text-align: center; border: 1px solid #ddd; background-color: #FFFFFF; box-sizing: border-box; }');
    
    // Responsive layout
    printWindow.document.write('@media (min-width: 1200px) { .output-container { grid-template-columns: repeat(6, 1fr); } }');
    printWindow.document.write('@media (min-width: 992px) and (max-width: 1199px) { .output-container { grid-template-columns: repeat(5, 1fr); } }');
    printWindow.document.write('@media (min-width: 768px) and (max-width: 991px) { .output-container { grid-template-columns: repeat(4, 1fr); } }');
    printWindow.document.write('@media (max-width: 767px) { .output-container { grid-template-columns: repeat(2, 1fr); } }');
    
    // Print-specific styles to ensure 6 columns
    printWindow.document.write('@media print {');
    printWindow.document.write('.output-container { grid-template-columns: repeat(6, 1fr) !important; grid-gap: 5px; }');
    printWindow.document.write('.output-number { -webkit-print-color-adjust: exact; print-color-adjust: exact; font-weight: bolder; }');
    printWindow.document.write('}');
    printWindow.document.write('</style>');
    printWindow.document.write('</head><body>');
    printWindow.document.write('<div class="container"><div class="output-container">' + output + '</div></div>');
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    
   
    printWindow.print();
}