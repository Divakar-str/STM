
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
    
    
    
    
    
    
    const migaathirstam= [19,37,41,45];
    const athirstam = [5,6,9,10,14,15,16,21,23,24,27,32,33,36,46,50,51];
    const thuraathirstam= [7,8,11,13,17,18,22,28,31,40,42,49,58];
    const aathiryaialipathu=[55];
    const sothanai=[25,34,43,47];
    const sumar=[12,30,38,39,48,54,56,57];
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
    