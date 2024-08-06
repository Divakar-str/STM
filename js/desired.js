var fancy = [
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 22, 33, 44, 55, 66, 77, 88, 99, 100, 101, 123, 222, 234, 333,
    345, 444, 456, 555, 567, 666, 678, 777, 786, 789, 888, 999, 1000, 1001, 1212, 1234, 1988, 1990, 2000,
    2002, 2020, 2121, 2222, 2345, 2525, 2626, 2727, 2728, 3000, 3003, 3030, 3333, 3456, 4000, 4004, 4040, 4444,
    4567, 4777, 5000, 5005, 5050, 5555, 6000, 6006, 6060, 6666, 6789, 7000, 7007, 7070, 7171, 7172, 7337, 7575, 7576,
    7777, 8000, 8118, 8181, 8448, 8484, 8586, 8888, 9000, 9009, 9090, 9091, 9097, 9779, 9797, 9999
  ];
  
  function generateNumbers() {
    // Fetch criteria and range values from input fields
    var firstCriteria = document.getElementById('firstInput').value.trim();
    var secondCriteria = document.getElementById('secondInput').value.trim();
    var thirdCriteria = document.getElementById('thirdInput').value.trim();
    var fourthCriteria = document.getElementById('fourthInput').value.trim();
    var sumCriteria = parseInt(document.getElementById('sumInput').value);
    var startRange = parseInt(document.getElementById('startRange').value);
    var endRange = parseInt(document.getElementById('endRange').value);
  
    // Validate input range
    if (isNaN(startRange) || isNaN(endRange)) {
      alert('Please provide valid numeric range.');
      return;
    }
  
    // Phase 1: Generate numbers based on criteria
    var filteredNumbers = [];
    for (var i = startRange; i <= endRange; i++) {
      var numStr = i.toString().padStart(4, '0');
  
      if (
        (firstCriteria.length === 0 || numStr[0] === firstCriteria) &&
        (secondCriteria.length === 0 || numStr[1] === secondCriteria) &&
        (thirdCriteria.length === 0 || numStr[2] === thirdCriteria) &&
        (fourthCriteria.length === 0 || numStr[3] === fourthCriteria)
      ) {
        filteredNumbers.push(numStr);
      }
    }
  
    // Phase 2: Filter numbers based on sum criteria
    var generatedNumbers = [];
    filteredNumbers.forEach(function (numStr) {
      // Calculate sum of digits (continue until single digit)
      var sum = calculateSingleDigitSum(numStr);
  
      // Check against sum criteria
      if (sum === sumCriteria) {
        generatedNumbers.push(numStr);
      }
    });
  
    // Display generated numbers in rows and columns
    displayNumbers(generatedNumbers);
  }
  
  function calculateSingleDigitSum(numStr) {
    var sum = [...numStr].reduce((acc, curr) => acc + parseInt(curr), 0);
    while (sum >= 10) {
      sum = [...String(sum)].reduce((acc, curr) => acc + parseInt(curr), 0);
    }
    return sum;
  }
  
  function displayNumbers(numbers) {
    var output = document.getElementById('output');
    output.innerHTML = ''; // Clear previous output
  
    var html = '';
    var numPerRow = 5; // Number of numbers per row
  
    numbers.forEach(function (number, index) {
      if (index % numPerRow === 0) {
        html += '<div class="row">';
      }
  
      var numberInt = parseInt(number);
      var isFancy = fancy.includes(numberInt);
      var bgColor = isFancy ? '#FFD700' : '#FFFFFF'; // Yellow background for fancy numbers
  
      html += '<div class="col-md-2">';
      html += '<div class="output-number col-md-2 code-container" style="background-color: ' + bgColor + ';">' + number + '</div>';
      html += '</div>';
  
      if (index % numPerRow === numPerRow - 1) {
        html += '</div>';
      }
    });
  
    if (numbers.length % numPerRow !== 0) {
      html += '</div>';
    }
  
    output.innerHTML = html;
  }

  function moveFocus(currentInput, nextInput, prevInput = null) {
    currentInput.addEventListener('input', function(event) {
        if (currentInput.value.length > 0) {
            nextInput.focus();
        }
    });

    if (prevInput) {
        currentInput.addEventListener('keydown', function(event) {
            if (event.key === 'Backspace' && currentInput.value.length === 0) {
                prevInput.focus();
            }
        });
    }
}

moveFocus(document.getElementById('firstInput'), document.getElementById('secondInput'));
moveFocus(document.getElementById('secondInput'), document.getElementById('thirdInput'), document.getElementById('firstInput'));
moveFocus(document.getElementById('thirdInput'), document.getElementById('fourthInput'), document.getElementById('secondInput'));
moveFocus(document.getElementById('fourthInput'), document.getElementById('sumInput'), document.getElementById('thirdInput'));
moveFocus(document.getElementById('sumInput'), document.getElementById('startRange'), document.getElementById('fourthInput'));
moveFocus(document.getElementById('startRange'), document.getElementById('endRange'), document.getElementById('sumInput'));


document.getElementById('endRange').addEventListener('input', function() {
   
    moveFocus(this, document.getElementById('generate'));
});





  
  
  
  function printNumbers() {
    var output = document.getElementById('output').innerHTML;
   

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



  
