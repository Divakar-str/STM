
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
        var resultDiv = document.getElementById("result");
        result.innerHTML = "";
        result.innerHTML +=desiredSum;
        resultDiv.innerHTML = "";
       

        for (var number = startNumber; number <= maxNumber; number++) {
            if (sumDigits(number)) {
                var formattedNumber = ("0000" + number).slice(-4);
    
                // Create a Bootstrap-styled container div
                var container = document.createElement("span");
                container.className = "code-container  col-3 mb-3"; // Use Bootstrap grid classes
    
            
                container.textContent = formattedNumber;
    
                if (fancy.includes(number)) {
                    container.classList.add("fancy");
                }
    
         
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

    function printResultss() {

        var resultContent = document.getElementById("div").innerHTML;
        var printWindow = window.open("", "_blank");
        printWindow.document.write("<style>   #result {display: flex;flex-wrap: wrap;  border: 1px solid #ccc; padding:3px} .fancy { background-color: yellow;} #i{text-align:center}</style>")
        printWindow.document.write( "<style>.cell {  width: 50px;height: 30px;  padding: 5px; border: 1px solid #ccc; text-align: center;  margin: 5px;font-size: 25px;font-weight: bold;border-radius: 5px;transition: background-color 0.3s ease-in-out; }</style>");
        printWindow.document.write("<style>   @media print {.cell {-webkit-print-color-adjust: exact;print-color-adjust: exact;}.fancy {-webkit-print-color-adjust: exact;print-color-adjust: exact;background-color: yellow !important;color: #000 !important;}#result {margin-top: 0;}</style>  ");
        printWindow.document.write("<div id='result'>");
        printWindow.document.write(resultContent+"</div>" );
        printWindow.document.close();
        printWindow.print();
    }



    function printResult() {
        // Get the content of the <h1> element
        var h1Content = document.querySelector("#div h1").innerHTML;
    
        // Get the content of the generated codes container
        var generatedCodesContent = document.getElementById("result").innerHTML;
    
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
    
   



