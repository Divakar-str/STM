// Function to generate codes based on user input
function generate() {
    const charToNumberMapping = {
        'A': 1, 'I': 1, 'J': 1, 'Q': 1, 'Y': 1,
        'B': 2, 'K': 2, 'R': 2,
        'C': 3, 'G': 3, 'L': 3, 'S': 3,
        'D': 4, 'M': 4, 'T': 4,
        'E': 5, 'N': 5, 'X': 5,
        'U': 6, 'V': 6, 'W': 6,
        'O': 7, 'Z': 7,
        'F': 8, 'P': 8
    };
    
    
    
    const userChars = document.getElementById('userChars').value.toUpperCase();
    const minValue = parseInt(document.getElementById('minValue').value);
    const maxValue = parseInt(document.getElementById('maxValue').value);
    const userNumber = parseInt(document.getElementById('userNumber').value);

    if (!isNaN(minValue) && !isNaN(maxValue) && !isNaN(userNumber)) {
        if (minValue <= maxValue) {
            const outputContainer = document.getElementById('generatedCodes');
            outputContainer.innerHTML = ''; // Clear previous results

            const Value_1 = charToNumberMapping[userChars[0]] || 0;
            const Value_2 = charToNumberMapping[userChars[1]] || 0;
            const initial = 4 + 5 + 5 + 2 + Value_1 + Value_2;

            for (let i = minValue; i <= maxValue; i++) {
                let codeValue = initial + i;
                while (codeValue > 9) {
                    codeValue = Array.from(String(codeValue), Number).reduce((a, b) => a + b);
                }

                if (userNumber === codeValue) {
                    let matchedCodeGenerated = `TN52${userChars}${i}`;
                    const outputSpan = document.createElement('span');
                    outputSpan.className = 'col-md-2 code-container output-number min-size'; 
                    var bgColor = fancy.includes(i) ? '#FFD700' : '#FFFFFF';
                    outputSpan.textContent = matchedCodeGenerated;
                    outputSpan.style.backgroundColor = bgColor;
                    outputContainer.appendChild(outputSpan);
                }
            }

            
        } else {
            alert('Invalid range: minValue should be less than or equal to maxValue.');
        }
    } else {
        alert('Invalid input: Please ensure minValue, maxValue, and userNumber are numbers.');
    }
}

// Function to validate input and move focus to the next input field
function validateRangeInput(inputElement, maxLength, nextInputId) {
    const value = inputElement.value;
    inputElement.value = value.replace(/[^0-9]/g, '').slice(0, maxLength);

    if (inputElement.value.length === maxLength && nextInputId) {
        const nextInput = document.getElementById(nextInputId);
        if (nextInput) {
            nextInput.focus();
        } else {
            console.error(`Element with ID ${nextInputId} not found.`);
            alert(`Element with ID ${nextInputId} not found.`);
        }
    } else if (inputElement.value.length > maxLength) {
        alert(`Input value exceeds maximum length of ${maxLength} digits.`);
    }
}

// Function to print the results
function printResults() {
    var output = document.getElementById('generatedCodes').innerHTML;

    if (!output.trim()) {
        alert("No results to print.");
        return;
    }

    var printWindow = window.open('', '', 'height=600,width=800');
    printWindow.document.write('<html><head><title>Print Numbers</title>');
    printWindow.document.write('<link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0/css/bootstrap.min.css">');
    printWindow.document.write('<style>');
    
    // Default styles for the output container
    printWindow.document.write(`
        .output-container {
            border: 1px solid #4545;
            padding: 20px;
            display: grid;
            grid-gap: 11px;
            background-color: #f2f2f2;
        }

        .output-number {
            padding: 6px ;
            text-align: center;
            border: 1px solid #4545;
            background-color: #FFFFFF;
            box-sizing: border-box;
            font-size: 22px;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 45px;
            min-width: 103px;
            border-radius: 5px;
            overflow: hidden;
            white-space: nowrap;
            text-overflow: ellipsis;
            margin:3px;
           
            
        }

        /* Responsive layout */
        @media (min-width: 1200px) { .output-container { grid-template-columns: repeat(6, 1fr); } }
        @media (min-width: 992px) and (max-width: 1199px) { .output-container { grid-template-columns: repeat(5, 1fr); } }
        @media (min-width: 768px) and (max-width: 991px) { .output-container { grid-template-columns: repeat(4, 1fr); } }
        @media (max-width: 767px) { .output-container { grid-template-columns: repeat(2, 1fr); } }

        /* Print-specific styles to ensure A4 layout and 6 columns */
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

