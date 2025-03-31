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

            let numbers = [];
            for (let i = minValue; i <= maxValue; i++) {
                let codeValue = initial + i;
                while (codeValue > 9) {
                    codeValue = Array.from(String(codeValue), Number).reduce((a, b) => a + b);
                }

                if (userNumber === codeValue) {
                    let formattedNumber = `TN52${userChars}${i.toString().padStart(4, '0')}`;
                    numbers.push(formattedNumber);
                }
            }

            if (numbers.length === 0) {
                outputContainer.innerHTML = "<p>No matching numbers found.</p>";
                return;
            }

            // Creating a structured table layout dynamically
            let columns = Math.min(5, Math.ceil(Math.sqrt(numbers.length)));
            let rows = Math.ceil(numbers.length / columns);

            let tableHTML = "<table class='fancy-table' style='width: 100%; border-collapse: collapse;'>";
            for (let i = 0; i < rows; i++) {
                tableHTML += "<tr>";
                for (let j = 0; j < columns; j++) {
                    let index = i * columns + j;
                    if (index < numbers.length) {
                        let isFancy = fancy.includes(parseInt(numbers[index].slice(-4)));
                        tableHTML += `<td class='${isFancy ? "fancy" : ""}'>${numbers[index]}</td>`;
                    } else {
                        tableHTML += "<td></td>";
                    }
                }
                tableHTML += "</tr>";
            }
            tableHTML += "</table>";

            outputContainer.innerHTML = tableHTML;
        } else {
            alert('Invalid range: minValue should be less than or equal to maxValue.');
        }
    } else {
        alert('Invalid input: Please ensure minValue, maxValue, and userNumber are numbers.');
    }
}

// Function to print results
function printFullNo() {
    let resultDiv = document.getElementById("generatedCodes");
    if (!resultDiv.innerHTML.trim()) {
        alert("No numbers to print.");
        return;
    }

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
                .fancy { border: 1px solid #FFD700 !important; background-color:#FFD700; font-weight: bold; }
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
            ${resultDiv.innerHTML}
        </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
}
