
var fancy = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 22, 33, 44, 55, 66, 77, 88, 99, 100, 101, 123, 222, 234, 333, 
    345, 444, 456, 555, 567, 666, 678, 777, 786, 789, 888, 999, 1000, 1001, 1212, 1234, 1988, 1990, 2000, 
    2002, 2020, 2121, 2222, 2345, 2525, 2626, 2727, 2728, 3000, 3003, 3030, 3333, 3456, 4000, 4004, 4040, 4444, 
    4567, 4777, 5000, 5005, 5050, 5555, 6000, 6006, 6060, 6666, 6789, 7000, 7007, 7070, 7171, 7172, 7337, 7575, 7576,
     7777, 8000, 8118, 8181, 8448, 8484, 8586, 8888, 9000, 9009, 9090, 9091, 9097, 9779, 9797, 9999];

    function calculateSumDigits() {
        var startNumber = parseInt(document.getElementById("startNumber").value);
        var result= document.getElementById("i");
        var desiredSum = parseInt(document.getElementById("sumDigits").value);
        
        var maxNumber = parseInt(document.getElementById("maxNumber").value);
        var resultDiv = document.getElementById("rangeresult");
        result.innerHTML = "";
        result.innerHTML +=desiredSum;
        resultDiv.innerHTML = "";
       

        for (var number = startNumber; number <= maxNumber; number++) {
            if (sumDigits(number)) {
                var formattedNumber = ("0000" + number).slice(-4);
    
                // Create a Bootstrap-styled container div
                var container = document.createElement("span");
                container.className = "col-md-2 code-container output-number"; // Use Bootstrap grid classes
    
            
                container.textContent = formattedNumber;
    
                var bgColor = fancy.includes(number) ? '#FFD700' : '#FFFFFF';
                container.style.backgroundColor = bgColor;

    
         
                resultDiv.appendChild(container);
            }
        }
    }

    function sumDigits(number) {
        var desiredSum = parseInt(document.getElementById("sumDigits").value);
        while (number > 9) {
            number = Array.from(String(number), Number).reduce((a, b) => a + b);
        }
        return number === desiredSum;
    }



    function validateRangeInput(inputElement, maxLength, nextInputId) {
        const value = inputElement.value;
        // Allow only numbers and limit length
        inputElement.value = value.replace(/[^0-9]/g, '').slice(0, maxLength);

        // Move focus to next field if criteria are met
        if (inputElement.value.length === maxLength && nextInputId) {
            document.getElementById(nextInputId).focus();
        }
    }

    function handleKeyDown(event) {
        if (event.key === 'Enter') {
            event.preventDefault(); // Prevent form submission
            const activeElement = document.activeElement;
            if (activeElement.id === 'sumDigits') {
                document.getElementById('calculateButton').click(); // Trigger Calculate button
            }
        }
    }

    // Add event listeners to move focus and handle input validation
    document.getElementById('startNumber').addEventListener('input', function() {
        validateRangeInput(this, 4, 'maxNumber');
    });

    document.getElementById('maxNumber').addEventListener('input', function() {
        validateRangeInput(this, 4, 'sumDigits');
    });

    document.getElementById('sumDigits').addEventListener('input', function() {
        validateRangeInput(this, 1, null);
    });
    document.getElementById('rangebtn').addEventListener('click', function() {
        calculateSumDigits();
    });


    function printResult() {
        var output = document.getElementById('rangeresult').innerHTML;
    
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
        printWindow.document.write('.output-number { -webkit-print-color-adjust: exact; print-color-adjust: exact; }');
        printWindow.document.write('}');
        printWindow.document.write('</style>');
        printWindow.document.write('</head><body>');
        printWindow.document.write('<div class="container"><div class="output-container">' + output + '</div></div>');
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        printWindow.print();
    }
    
    
   



