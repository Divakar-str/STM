
function myFunction() {
    document.getElementById("t1").innerHTML ="";
    document.getElementById("t2").innerHTML ="";
    document.getElementById("c1").innerHTML ="";
    document.getElementById("c2").innerHTML ="";
    document.getElementById("r1").innerHTML ="";
    document.getElementById("r2").innerHTML ="";
    document.getElementById("rr1").innerHTML ="";
    document.getElementById("rr2").innerHTML ="";
    const A = I = J = Q = Y = 1;
    const B= K= R= 2;
    const C= G =L= S= 3;
    const D= M =T = 4;
    const E= H=N= X= 5;
    const  U=V =W= 6;
    const  O= Z=7 ;
    const F= P=8 ;
    
    var num = document.getElementById("box").value;
    
    let result = num.slice(0,1).toUpperCase();
    let result1 = num.slice(1,2).toUpperCase() ;
    
    if(isNaN(result1)){
      temp = eval(result1);
      result5 = num.slice(5,6);
      half = num.slice(2,6);
     
    }
    else{
    
      temp=0;
      half = num.slice(1,6);
      result5 = num.slice(1,2);
    }
    document.getElementById("t1").innerHTML =half;
    document.getElementById("t2").innerHTML ="TN52"+num.toUpperCase();
    
    
    let out=eval(result)+eval(temp);
    
    
    let result2 = num.slice(2,3);
    let result3 = num.slice(3,4);
    let result4 = num.slice(4,5);
    let result6= parseInt(result2)+parseInt(result3)+parseInt(result4)+parseInt(result5);
    
    
    let length = result6.toString().length;
    
    
    if (length ==2) {
      let res1 =result6.toString().slice(0,1);
      let res2 =result6.toString().slice(1,2);
      res=parseInt(res1)+parseInt(res2);
      
    } else {
      res=result6;
    }
    
    
    let out1= out+result6+16;
    
    
    let length1 = out1.toString().length;
    if (length1 ==2) {
      let res1 =out1.toString().slice(0,1);
      let res2 =out1.toString().slice(1,2);
      out2=parseInt(res1)+parseInt(res2);
     
      
    } else {
      out2=out1;
    }
    
    
    
    document.getElementById("c1").innerHTML =result6 +"<br>" +res;
    document.getElementById("c2").innerHTML =out1+"<br>"+out2;
    
    
    
    
    
    
    const migaathirstam= [19,23,37,41,45];
    const athirstam = [1,3,5,6,9,10,14,15,16,18,21,23,24,27,32,33,36,42,46,50,51];
    const thuraathirstam= [7,8,11,13,17,22,28,31,40,49,58];
    const aathiryaialipathu=[20,55];
    const sothanai=[25,34,43,47];
    const sumar=[2,12,30,38,39,48,54,56,57];
    const aapathu=[20,26,29,35,44,53];
    const aamatram=[52];
    
    if(migaathirstam.includes(result6)){
    document.getElementById("r1").innerHTML ="மிக மிக அதிர்ஸ்டம்";
    
    }
    else if(athirstam.includes(result6)){
    document.getElementById("r1").innerHTML ="அதிர்ஸ்டம்";
    
    }
    else if(thuraathirstam.includes(result6)){
    document.getElementById("r1").innerHTML ="துரஅதிர்ஸ்டம்";
    
    }
    else if(aathiryaialipathu.includes(result6)){
    document.getElementById("r1").innerHTML ="எதிரியை அழிப்பது";
    
    }
    else if(sothanai.includes(result6)){
    
    document.getElementById("r1").innerHTML ="சோதனை மிக்கது";
    }
    else if(sumar.includes(result6)){
    document.getElementById("r1").innerHTML ="சுமார்";
    
    }
    else if(aapathu.includes(result6)){
    
    document.getElementById("r1").innerHTML ="ஆபத்து";
    }
    else if(aamatram.includes(result6)){
    
    document.getElementById("r1").innerHTML ="ஏமாற்றம்";
    }
    
    
    if(migaathirstam.includes(out1)){
    document.getElementById("r2").innerHTML ="மிக மிக அதிர்ஸ்டம்";
    
    }
    else if(athirstam.includes(out1)){
    document.getElementById("r2").innerHTML ="அதிர்ஸ்டம்";
    
    }
    else if(thuraathirstam.includes(out1)){
    document.getElementById("r2").innerHTML ="துரஅதிர்ஸ்டம்";
    
    }
    else if(aathiryaialipathu.includes(out1)){
    document.getElementById("r2").innerHTML ="எதிரியை அழிப்பது";
    
    }
    else if(sothanai.includes(out1)){
    
    document.getElementById("r2").innerHTML ="சோதனை மிக்கது";
    }
    else if(sumar.includes(out1)){
    document.getElementById("r2").innerHTML ="சுமார்";
    
    }
    else if(aapathu.includes(out1)){
    
    document.getElementById("r2").innerHTML ="ஆபத்து";
    }
    else if(aamatram.includes(out1)){
    
    document.getElementById("r2").innerHTML ="ஏமாற்றம்";
    }
    
    
    if(migaathirstam.includes(res)){
    document.getElementById("rr1").innerHTML ="மிக மிக அதிர்ஸ்டம்";
    
    }
    else if(athirstam.includes(res)){
    document.getElementById("rr1").innerHTML ="அதிர்ஸ்டம்";
    
    }
    else if(thuraathirstam.includes(res)){
    document.getElementById("rr1").innerHTML ="துரஅதிர்ஸ்டம்";
    
    }
    else if(aathiryaialipathu.includes(res)){
    document.getElementById("rr1").innerHTML ="எதிரியை அழிப்பது";
    
    }
    else if(sothanai.includes(res)){
    
    document.getElementById("rr1").innerHTML ="சோதனை மிக்கது";
    }
    else if(sumar.includes(res)){
    document.getElementById("rr1").innerHTML ="சுமார்";
    
    }
    else if(aapathu.includes(res)){
    
    document.getElementById("rr1").innerHTML ="ஆபத்து";
    }
    else if(aamatram.includes(res)){
    
    document.getElementById("rr1").innerHTML ="ஏமாற்றம்";
    }
    
    
    if(migaathirstam.includes(out2)){
    document.getElementById("rr2").innerHTML ="மிக மிக அதிர்ஸ்டம்";
    
    }
    else if(athirstam.includes(out2)){
    document.getElementById("rr2").innerHTML ="அதிர்ஸ்டம்";
    
    }
    else if(thuraathirstam.includes(out2)){
    document.getElementById("rr2").innerHTML ="துரஅதிர்ஸ்டம்";
    
    }
    else if(aathiryaialipathu.includes(out2)){
    document.getElementById("rr2").innerHTML ="எதிரியை அழிப்பது";
    
    }
    else if(sothanai.includes(out2)){
    
    document.getElementById("rr2").innerHTML ="சோதனை மிக்கது";
    }
    else if(sumar.includes(out2)){
    document.getElementById("rr2").innerHTML ="சுமார்";
    
    }
    else if(aapathu.includes(out2)){
    
    document.getElementById("rr2").innerHTML ="ஆபத்து";
    }
    else if(aamatram.includes(out2)){
    
    document.getElementById("rr2").innerHTML ="ஏமாற்றம்";
    }
    
    
    }
    

    const constants = [
      { letter: 'A', value: 1 }, { letter: 'B', value: 2 }, { letter: 'C', value: 3 },
      { letter: 'D', value: 4 }, { letter: 'E', value: 5 }, { letter: 'F', value: 8 },
      { letter: 'G', value: 3 }, { letter: 'H', value: 5 }, { letter: 'I', value: 1 },
      { letter: 'J', value: 1 }, { letter: 'K', value: 2 }, { letter: 'L', value: 3 },
      { letter: 'M', value: 4 }, { letter: 'N', value: 5 }, { letter: 'O', value: 7 },
      { letter: 'P', value: 8 }, { letter: 'Q', value: 1 }, { letter: 'R', value: 2 },
      { letter: 'S', value: 3 }, { letter: 'T', value: 4 }, { letter: 'U', value: 6 },
      { letter: 'V', value: 6 }, { letter: 'W', value: 6 }, { letter: 'X', value: 5 },
      { letter: 'Y', value: 1 }, { letter: 'Z', value: 7 }
    ];
    

// Function to generate the table dynamically
function generateTable(className) {
  const table = document.createElement('table');
  table.className = className || ''; // Set the custom class name if provided
  const headerRow = document.createElement('tr');
  constants.forEach(constant => {
      const th = document.createElement('th');
      th.textContent = constant.letter;
      headerRow.appendChild(th);
  });
  table.appendChild(headerRow);

  const valueRow = document.createElement('tr');
  constants.forEach(constant => {
      const td = document.createElement('td');
      td.textContent = constant.value;
      valueRow.appendChild(td);
  });
  table.appendChild(valueRow);

  return table;
}

window.onload = function() {
  const customClassName = 'custom-table'; // You can change this to your desired class name
  const tableContainer = document.getElementById('constantsTableContainer');
  const table = generateTable(customClassName);
  tableContainer.appendChild(table);
};



// Define arrays
const migaathirstam= [19,23,37,41,45];
const athirstam = [1,3,5,6,9,10,14,15,16,18,21,23,24,27,32,33,36,42,46,50,51];
const thuraathirstam= [7,8,11,13,17,22,28,31,40,49,58];
const aathiryaialipathu=[20,55];
const sothanai=[25,34,43,47];
const sumar=[2,12,30,38,39,48,54,56,57];
const aapathu=[20,26,29,35,44,53];
const aamatram=[52];

// Function to fill table data
function fillTableData(array, id) {
    document.getElementById(id).textContent = array.join(', ');
}

// Fill table data
fillTableData(migaathirstam, 'migaathirstam');
fillTableData(athirstam, 'athirstam');
fillTableData(thuraathirstam, 'thuraathirstam');
fillTableData(aathiryaialipathu, 'aathiryaialipathu');
fillTableData(sothanai, 'sothanai');
fillTableData(sumar, 'sumar');
fillTableData(aapathu, 'aapathu');
fillTableData(aamatram, 'aamatram');
