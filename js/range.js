
// Function to validate number input and auto-jump
function validateNumber(input, maxLength, nextFieldId) {
    input.value = input.value.replace(/\D/g, ''); // Remove non-numeric characters

    if (input.id === "sumDigits" && (input.value < 1 || input.value > 9)) {
        input.value = ""; // Reset if out of range
    }

    if (input.value.length === maxLength) {
        document.getElementById(nextFieldId)?.focus(); // Move to next field
    }
}

// Auto move back when deleting an empty field
document.addEventListener("keydown", function (event) {
    let activeElement = document.activeElement;

    if (event.key === "Backspace" && activeElement.value === "") {
        if (activeElement.id === "maxNumber") {
            document.getElementById("startNumber").focus();
        } else if (activeElement.id === "sumDigits") {
            document.getElementById("maxNumber").focus();
        }
    }
});


function sumDigits(number) {
    var sum = number.toString().split('').reduce((acc, digit) => acc + parseInt(digit), 0);
    while (sum >= 10) {
        sum = sum.toString().split('').reduce((acc, digit) => acc + parseInt(digit), 0);
    }
    return sum;
}
// Function to handle generating the numbers and displaying in a table
function calculateSumDigits() {
    var startNumber = parseInt(document.getElementById("startNumber").value);
    var desiredSum = parseInt(document.getElementById("sumDigits").value);
    var maxNumber = parseInt(document.getElementById("maxNumber").value);

    if (isNaN(startNumber) || isNaN(desiredSum) || isNaN(maxNumber)) {
        alert("Please enter valid numbers in all fields.");
        return;
    }

    if (startNumber > maxNumber) {
        alert("Start number must be less than or equal to Max number.");
        return;
    }

    var resultDiv = document.getElementById("rangeresult");
    resultDiv.innerHTML = ""; // Clear previous results

    var numbers = [];

    // Loop through the range and find numbers with the desired sum of digits
    for (var number = startNumber; number <= maxNumber; number++) {
        if (sumDigits(number) === desiredSum) {
            let formattedNumber = ("0000" + number).slice(-4); // Format to 4 digits
            numbers.push(formattedNumber);
        }
    }

    // Check if we have results
    if (numbers.length === 0) {
        resultDiv.innerHTML = "<p>No matching numbers found.</p>";
        return;
    }

    // Calculate table dimensions
    let columns = Math.min(6, Math.ceil(Math.sqrt(numbers.length))); // Maximum of 6 columns
    let rows = Math.ceil(numbers.length / columns);

    let tableHTML = "<table class='fancy-table' style='width: 100%; border-collapse: collapse;'>";
    for (let i = 0; i < rows; i++) {
        tableHTML += "<tr>";
        for (let j = 0; j < columns; j++) {
            let index = i * columns + j;
            if (index < numbers.length) {
                let isFancy = fancy.includes(parseInt(numbers[index])); // Check if it's a "fancy" number
                tableHTML += `<td class='${isFancy ? "fancy" : ""}' style='border: 1px solid black; padding: 10px; text-align: center; font-size: 18px;'>${numbers[index]}</td>`;
            } else {
                tableHTML += "<td></td>"; // Empty cell if out of bounds
            }
        }
        tableHTML += "</tr>";
    }
    tableHTML += "</table>";

    resultDiv.innerHTML = tableHTML; // Insert the table into the result div
}


function printResults(divid) {
    let resultDiv = document.getElementById(divid);
    if (!resultDiv) {
        alert("Result div not found.");
        return;
    }
    if (resultDiv.innerHTML.trim() === "") {
        alert("No results to print.");
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

                .sum-1, .color-1 { background-color: #ff2f00ac !important; }
                .sum-2, .color-2 { background-color: #337affd0 !important; }
                .sum-3, .color-3 { background-color: #008444cd !important; }
                .sum-4, .color-4 { background-color: #fc0101b2 !important; }
                .sum-5, .color-5 { background-color: #ff0048d6 !important; }
                .sum-6, .color-6 { background-color: #00fcc1cd !important; }
                .sum-7, .color-7 { background-color: #8b33ffac !important; }
                .sum-8, .color-8 { background-color: #ff58338d !important; }
                .sum-9, .color-9 { background-color: #0a8deaa7 !important; }

                /* Fancy Highlight */
                .fancy { 
                    position: relative; 
                    font-weight: bold; 
                    border: 2px solid #FFD700 !important; 
                    box-shadow: 0px 0px 8px #FFD700 !important; /* Glow effect */
                }

                /* Ensure colors & fancy highlight print */
                @media print { 
                    @page { size: A4; margin: 10mm; } 
                    .fancy { 
                        background-color: #FFD700 !important;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    td {
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
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

    printWindow.onload = function () {
        printWindow.print();
        printWindow.close(); // Close after printing
    };
}


