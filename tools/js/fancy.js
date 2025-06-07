let allNumbers = new Set(); // To store unique numbers
let filteredNumbers = [];

function generateTableFromInput() {
  const numbersInput = document.getElementById("numbersInput").value;
  const numbers = numbersInput.split('\n').map(num => num.trim()).filter(num => num !== "");

  if (numbers.length === 0) {
    alert("Please paste some numbers!");
    return;
  }

  const validNumbers = numbers.filter(num => /^\d{4}$/.test(num)); // Only 4-digit numbers

  if (validNumbers.length === 0) {
    alert("No valid 4-digit numbers found!");
    return;
  }

  // Add valid numbers to the allNumbers set to ensure uniqueness
  validNumbers.forEach(num => allNumbers.add(num));

  // Sort and filter unique numbers
  const uniqueNumbers = Array.from(allNumbers).sort((a, b) => parseInt(a) - parseInt(b));
  filteredNumbers = uniqueNumbers;
  if (filteredNumbers.length > 0) {
    const start = filteredNumbers[0];
    const end = filteredNumbers[filteredNumbers.length - 1];
    document.getElementById("filteredrange").textContent = `${start} to ${end}`;
  } else {
    document.getElementById("filteredrange").textContent = "No numbers in the list.";
  }
  displayTable(filteredNumbers);
  displayStatistics(filteredNumbers);
  document.getElementById("numbersInput").value = ""; // Clear the input field
  
}

function clearFilter() {
  // Uncheck all checkboxes
  document.querySelectorAll('.filter-option input[type="checkbox"]').forEach(checkbox => checkbox.checked = false);

  // Remove the 'selected' class from all number circles
  document.querySelectorAll('.number-circle').forEach(circle => circle.classList.remove('selected'));

  // Refresh table and statistics
  displayTable(allNumbers);
  displayStatistics(allNumbers);
}

function displayTable(numbers) {
  let tableHTML = "<table class='number-table'><tbody>";

  for (let i = 0; i < numbers.length; i += 5) {
    const row = numbers.slice(i, i + 5);
    tableHTML += "<tr>";
    row.forEach(num => {
      const colorClass = `color-${num % 9 || 9}`;
      tableHTML += `<td class="${colorClass}">${num || ''}</td>`;
    });
    tableHTML += "</tr>";
  }

  tableHTML += "</tbody></table>";
  document.getElementById('table-container').innerHTML = tableHTML;
}

function displayStatistics(numbers) {
  const totalCounts = Array(10).fill(0);
  Array.from(allNumbers).forEach(num => {
    const digit = (parseInt(num) - 1) % 9 + 1;
    totalCounts[digit]++;
  });

  const selectedCounts = Array(10).fill(0);
  numbers.forEach(num => {
    const digit = (parseInt(num) - 1) % 9 + 1;
    selectedCounts[digit]++;
  });

  let combinedStatisticsHTML = "";
for (let i = 1; i <= 9; i++) {
  combinedStatisticsHTML += `
    <tr>
      <td class="color-${i}">${i}</td>
      <td class="color-${i}">${totalCounts[i]}</td>
      <td class="color-${i}">${selectedCounts[i]}</td>
    </tr>
  `;
}


  document.getElementById('statistics').innerHTML = `
    <div class="statistics-container">
      <table class="statistics-table">
        <thead>
          <tr>
            <th>Statistic</th>
            <th>Total - ${allNumbers.size}</th>
            <th>Filtered - ${filteredNumbers.length}</th>
          </tr>
        </thead>
        <tbody>
          ${combinedStatisticsHTML}
        </tbody>
      </table>
    </div>
  `;
}

function toggleCheckbox(event) {
  const checkbox = event.target;
  const circleDiv = checkbox.closest('.filter-option').querySelector('.number-circle');

  // Toggle 'selected' class based on checkbox state
  circleDiv.classList.toggle('selected', checkbox.checked);

  applyFilter(); // Reapply the filter after selection change
}

function applyFilter() {
  const selectedRoots = Array.from(document.querySelectorAll('.filter-option input:checked'))
                               .map(input => input.value);

  filteredNumbers = selectedRoots.length === 0
    ? Array.from(allNumbers) // No filter applied, show all
    : Array.from(allNumbers).filter(num => selectedRoots.includes((parseInt(num) % 9 || 9).toString()));

  displayTable(filteredNumbers);
  displayStatistics(filteredNumbers);
}

function generateFilterOption(number, colorClass) {
  const filterOption = document.createElement('div');
  filterOption.classList.add('filter-option', 'text-center');

  const label = document.createElement('label');
  label.classList.add('d-flex', 'align-items-center', 'justify-content-center');

  const circleDiv = document.createElement('div');
  circleDiv.classList.add(colorClass, 'rounded-circle', 'd-flex', 'align-items-center', 'justify-content-center', 'number-circle');
  circleDiv.style.width = '40px';
  circleDiv.style.height = '40px';
  circleDiv.style.cursor = 'pointer';

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.value = number;
  checkbox.classList.add('d-none');
  checkbox.id = `filter-${number}`;
  checkbox.addEventListener('change', toggleCheckbox); // Use event listener for checkbox change

  const numberSpan = document.createElement('span');
  numberSpan.classList.add('number-inside');
  numberSpan.textContent = number;

  circleDiv.appendChild(checkbox);
  circleDiv.appendChild(numberSpan);
  label.appendChild(circleDiv);
  filterOption.appendChild(label);

  return filterOption;
}

function populateFilterOptions() {
  const filterGroup = document.querySelector('.filter-group');
  const colorClasses = [
    'color-1', 'color-2', 'color-3', 'color-4', 
    'color-5', 'color-6', 'color-7', 'color-8', 'color-9'
  ];

  colorClasses.forEach((colorClass, index) => {
    const filterOption = generateFilterOption(index + 1, colorClass);
    filterGroup.appendChild(filterOption);
  });
}

// Call the function to populate the filter options on page load
window.onload = populateFilterOptions;
