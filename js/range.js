
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
                .fancy { background-color: #FFD700 !important; font-weight: bold; }
                .fancy { border: 1px solid #FFD700 !important; background-color:#FFD700; font-weight: bold; }
                @media print { 
                    @page { size: A4; margin: 10mm; } 
                    .fancy { 
                        background-color: #FFD700 !important; 
                        font-weight: bold; 
                        -webkit-print-color-adjust: exact; /* Ensure color prints */
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
