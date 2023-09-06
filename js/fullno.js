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
    
    const fancy = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 22, 33, 44, 55, 66, 77, 88, 99, 100, 101, 123, 222, 234, 333, 
        345, 444, 456, 555, 567, 666, 678, 777, 786, 789, 888, 999, 1000, 1001, 1212, 1234, 1988, 1990, 2000, 
        2002, 2020, 2121, 2222, 2345, 2525, 2626, 2727, 2728, 3000, 3003, 3030, 3333, 3456, 4000, 4004, 4040, 4444, 
        4567, 4777, 5000, 5005, 5050, 5555, 6000, 6006, 6060, 6666, 6789, 7000, 7007, 7070, 7171, 7172, 7337, 7575, 7576,
        7777, 8000, 8118, 8181, 8448, 8484, 8586, 8888, 9000, 9009, 9090, 9091, 9097, 9779, 9797, 9999];

    const userChars = document.getElementById('userChars').value.toUpperCase();
    const minValue = parseInt(document.getElementById('minValue').value);
    const maxValue = parseInt(document.getElementById('maxValue').value);
    const userNumber = parseInt(document.getElementById('userNumber').value);
    const h1Content = document.querySelector("#printableArea h1");
    h1Content.textContent = "THE TOTAL IS " + userNumber;

    if (!isNaN(minValue) && !isNaN(maxValue) && !isNaN(userNumber)) {
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
        const outputText = matchedCodeGenerated;
        const outputSpan = document.createElement('span');
        outputSpan.className = 'code-container col-3 mb-3'; // Bootstrap classes for styling
        if (fancy.includes(i)) {
            outputSpan.classList.add('fancy');
        }
        outputSpan.textContent = outputText;
        outputContainer.appendChild(outputSpan);
    }
}



    }
}

function printResults() {
    // Get the content of the <h1> element
    var h1Content = document.querySelector("#printableArea h1").innerHTML;

    // Get the content of the generated codes container
    var generatedCodesContent = document.getElementById("generatedCodes").innerHTML;

    // Create a new print window
    var printWindow = window.open("", "_blank");

    // Define common CSS styles with Bootstrap classes
    var commonStyles = `
        body {
            font-family: Arial, sans-serif;
            background-color: #f2f2f2;
            margin: 0;
            padding: 20px;
        }

        .h1-container {
            text-align: center;
            margin-bottom: 20px;
        }

        h1 {
            font-size: 24px;
            margin-bottom: 0;
        }

        #result {
            display: flex;
            flex-wrap: wrap;
            border: 1px solid #ccc;
            padding: 10px;
            margin-top: 20px;
        }

        .fancy {
            background-color: yellow;
        }
        @media print {
            /* Allow color to be preserved in print */
            .fancy {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
                background-color: yellow !important;
                color: #000 !important;
            }
        }

        #generatedCodes {
            background-color: white;
            padding: 10px;
            border: 1px solid #ccc;
            border-radius: 5px;
            overflow-x: auto;
        }

        .code-container {
            display: inline-block;
            margin-right: 10px;
            margin-bottom: 10px;
            border: 1px solid #ccc;
            padding: 10px;
            border-radius: 5px;
            margin-right: 10px;
            margin-bottom: 10px;
        }
    `;

    // Inject common styles into the print window
    var styleTag = printWindow.document.createElement("style");
    styleTag.appendChild(printWindow.document.createTextNode(commonStyles));
    printWindow.document.head.appendChild(styleTag);

    // Add content to the print window
    var resultContent = `
        <div class='container mt-4'>
            <h1 class='mb-4 text-center'>${h1Content}</h1>
            <div id='generatedCodes' class='row'>
                ${generatedCodesContent}
            </div>
        </div>
    `;
    printWindow.document.body.innerHTML = resultContent;

    // Close the print window after printing
    printWindow.addEventListener('afterprint', function() {
        printWindow.close();
    });

    // Print the content
    printWindow.print();
}


