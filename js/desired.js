// Handle input auto-focus and validation
function handleInput(inputElement, nextInputId) {
    inputElement.value = inputElement.value.replace(/\D/g, ''); // Allow only numbers

    if (inputElement.value.length === inputElement.maxLength && nextInputId) {
        let nextInput = document.getElementById(nextInputId);
        if (nextInput) nextInput.focus();
    }
}

// Calculate the sum of digits until a single digit is reached
function calculateSingleDigitSum(numStr) {
    var sum = [...numStr].reduce((acc, curr) => acc + parseInt(curr), 0);
    while (sum >= 10) {
        sum = [...String(sum)].reduce((acc, curr) => acc + parseInt(curr), 0);
    }
    return sum;
}

// Function to generate numbers based on input
function generateNumbers() {
    // Fetch values from the input fields
    var firstCriteria = document.getElementById('firstInput').value.trim();
    var secondCriteria = document.getElementById('secondInput').value.trim();
    var thirdCriteria = document.getElementById('thirdInput').value.trim();
    var fourthCriteria = document.getElementById('fourthInput').value.trim();
    var sumCriteria = parseInt(document.getElementById('sumInput').value);
    var startRange = parseInt(document.getElementById('startRange').value);
    var endRange = parseInt(document.getElementById('endRange').value);

    // Validate input range and sum criteria
    if (isNaN(startRange) || isNaN(endRange)) {
        alert('Please provide valid numeric range.');
        return;
    }
    if (sumCriteria < 1 || sumCriteria > 9 || isNaN(sumCriteria)) {
        alert('Please enter a valid sum target (1-9).');
        return;
    }

    // Phase 1: Generate numbers based on the criteria
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
        var sum = calculateSingleDigitSum(numStr);

        // Check if the sum matches the target sum
        if (sum === sumCriteria) {
            generatedNumbers.push(numStr);
        }
    });

    // Display generated numbers in a table grid
    displayNumbers(generatedNumbers);
}


// Display the generated numbers in a table layout
function displayNumbers(numbers) {
    var output = document.getElementById('output');
    output.innerHTML = ''; // Clear previous output

    if (numbers.length === 0) {
        output.innerHTML = '<p>No numbers found based on the criteria.</p>';
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
 
     output.innerHTML = tableHTML; // Insert the table into the result div
}

