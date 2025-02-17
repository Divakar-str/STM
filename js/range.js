
// Function to calculate the sum of digits and display the result
function calculateSumDigits() {
    var startNumber = parseInt(document.getElementById("startNumber").value);
    var desiredSum = parseInt(document.getElementById("sumDigits").value);
    var maxNumber = parseInt(document.getElementById("maxNumber").value);
    
    if (isNaN(startNumber) || isNaN(desiredSum) || isNaN(maxNumber)) {
        alert("Please ensure all input fields contain valid numbers.");
        return;
    }

    var resultDiv = document.getElementById("rangeresult");
    resultDiv.innerHTML = "";

    for (var number = startNumber; number <= maxNumber; number++) {
        if (sumDigits(number) === desiredSum) {
            var formattedNumber = ("0000" + number).slice(-4);
            var container = document.createElement("span");
            container.className = "col-md-2 code-container output-number";
            container.textContent = formattedNumber;
            container.style.backgroundColor = fancy.includes(number) ? '#FFD700' : '#FFFFFF';
            resultDiv.appendChild(container);
        }
    }

    
}

// Function to sum digits until the number is a single digit
function sumDigits(number) {
    while (number > 9) {
        number = Array.from(String(number), Number).reduce((a, b) => a + b);
    }
    return number;
}

// Function to validate input and move focus to the next input field
function validateNumber(inputElement, maxLength, nextInputId) {
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

// Function to print the result
function printResult() {
    var output = document.getElementById('rangeresult').innerHTML;
    var printWindow = window.open('', '', 'height=600,width=800');

    printWindow.document.write('<html><head><title>Print Numbers</title>');
    printWindow.document.write('<link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0/css/bootstrap.min.css">');
    printWindow.document.write('<style>');
    printWindow.document.write(`
        /* Container for output numbers */
        .output-container {
          padding: 20px;
          background-color: #f2f2f2;
          display: grid;
          gap: 5px;
          overflow: hidden;
          border: 1px solid #4545;
        }

        /* Style for each number box */
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
          font-size: x-large;
        }

        @media (min-width: 1200px) { .output-container { grid-template-columns: repeat(6, 1fr); } }
        @media (min-width: 992px) and (max-width: 1199px) { .output-container { grid-template-columns: repeat(5, 1fr); } }
        @media (min-width: 768px) and (max-width: 991px) { .output-container { grid-template-columns: repeat(4, 1fr); } }
        @media (max-width: 767px) { .output-container { grid-template-columns: repeat(2, 1fr); } }

        @media print {
          /* A4 page size */
          @page {
            size: A4;
            margin: 10mm;
          }
          
          /* Print-specific styles */
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

