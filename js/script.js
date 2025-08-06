const cardData = [
    {
        title: "Driving License",
        links: [
            { url: "https://sarathi.parivahan.gov.in/", text: "Sarathi", class: "link-primary", icon: "fas fa-car" ,additionalLinks: [
                { url: "#", text: "Renew License" },
                { url: "#", text: "Apply for Learner's License" }
            ]},
            { url: "https://sarathi.parivahan.gov.in/paymentscov/", text: "Fees Payment", class: "link-success", icon: "fas fa-money-bill-wave" },
            { url: "https://sarathi.parivahan.gov.in/cas/login?service=https%3A%2F%2Fsarathi.parivahan.gov.in%2Fsarathi%2Flogin.do", text: "Sarathi login", class: "link-danger", icon: "fas fa-sign-in-alt" },
            { url: "https://flagday.tn.gov.in/", text: "Flag", class: "link-info", icon: "fas fa-flag" }
        ]
        
    },
    {
        title: "Vehicle",
        links: [
            { url: "https://parivahan.gov.in/en", text: "Parivahan", class: "link-primary", icon: "fas fa-road" },
            { url: "https://vahan.parivahan.gov.in/vahanservice/vahan/ui/statevalidation/homepage.xhtml", text: "Vahan", class: "link-success", icon: "fas fa-truck" , additionalLinks: [
                { url: "https://vahan.parivahan.gov.in/vahanservice/vahan/ui/eapplication/form_eAppCommonHome.xhtml", text: "Reverify Transaction" } ]
            },
            { url: "https://vahan.parivahan.gov.in/appointment/vahan/ui/userpanel/bookappoinment.xhtml", text: "Appointment", class: "link-danger", icon: "fas fa-calendar-day" , additionalLinks: [
                { url: "https://vahan.parivahan.gov.in/appointment/vahan/ui/userpanel/form_rescheduleAppointment.xhtml", text: "Reschedule Appointment",icon: "fas fa-calendar-day" },
                { url: "https://vahan.parivahan.gov.in/appointment/vahan/ui/userpanel/form_ReprintReceipt.xhtml", text: "Print Appointment" }
            ]},
            { url: "https://vahan.parivahan.gov.in/vahan/vahan/ui/eapplication/form_payment.xhtml", text: "Online Payment", class: "link-info", icon: "fa fa-money-bill" }
        ]
    },
   
    {
        title: "NP permit",
        links: [
            { url: "https://vahan.parivahan.gov.in/onlinepermit/vahan/loginpage.xhtml?statecd=Mzc2MzM2MzAzNjY0MzIzODM3NjIzNjY0MzY2MjM3NTQ0ZQ==", text: "Online Permit", class: "link-info", icon: "fas fa-receipt" },            { url: "https://vahan.parivahan.gov.in/npermit/faces/np/jsp/nationalpermit.jsp", text: "NP Permit Home", class: "link-primary", icon: "fas fa-id-card" },
            { url: "https://vahan.parivahan.gov.in/npermit/faces/np/jsp/nationalpermit.jsp", text: "Permit Pay", class: "link-success", icon: "fas fa-receipt" },
            { url: "https://vahan.parivahan.gov.in/npermit/faces/np/jsp/printpermitreceipt.jsp", text: "Print Receipt", class: "link-danger", icon: "fas fa-print" }
            
        ]
    },
    {
        title: "Echallan",
        links: [
            { url: "https://echallan.parivahan.gov.in/index/accused-challan", text: "Echallan Pay", class: "link-primary", icon: "fas fa-receipt" },
            { url: "https://echallan.parivahan.gov.in/payment-verification/re-double-verification", text: "Failed Transaction", class: "link-success", icon: "fas fa-circle-exclamation" },
            { url: "https://echallan.parivahan.gov.in/payment-verification", text: "Pending Transaction", class: "link-danger", icon: "fas fa-spinner" },
            { url: "https://vahan.parivahan.gov.in/eTransPgi/paymentDetails", text: "Status", class: "link-info", icon: "fas fa-list" }
        ]
    },
    {
        title: "Message",
        links: [
            
            { url: "https://messages.google.com/web/", text: "Message Web", class: "link-primary", icon: "fas fa-sms" },
            { url: "https://web.whatsapp.com/", text: "Whatsapp Web", class: "link-success", icon: "fab fa-whatsapp" },
            { url: "https://www.messenger.com/", text: "Messenger", class: "link-danger", icon: "fab fa-facebook-messenger" },
            { url: "https://web.telegram.org/", text: "Telegram", class: "link-info", icon: "fab fa-telegram" }
        ]
    },
    {
        title: "Bank",
        links: [
            { url: "https://retail.onlinesbi.sbi/retail/login.htm", text: "SBI", class: "link-primary", icon: "fas fa-university" },
            { url: "https://internet-banking.retail.dbsbank.in/login", text: "DBS", class: "link-success", icon: "fas fa-building" },
            { url: "https://online.canarabank.in/?module=login", text: "Canara", class: "link-danger", icon: "fas fa-landmark" }
        ]
    },
    {
        title: "Utilities",
        links: [
            { url: "https://www.indiapost.gov.in/", text: "Post", class: "link-primary", icon: "fas fa-envelope" },
            { url: "https://fancy.parivahan.gov.in/", text: "Fancy Number", class: "link-success", icon: "fas fa-sort-numeric-desc" },
            { url: "https://vahan.parivahan.gov.in/nrservices/faces/user/citizen/citizenlogin.xhtml", text: "RC Details", class: "link-danger", icon: "fas fa-info-circle" },
            { url: "#", text: "Police Status",  class: "link-info",  icon: "fab fa-product-hunt",id: "pstatus"  }

        ]
    },

    {
        title:"Tools",
        links:[
            {url:"tools/print.html",text:"Print",class: "link-primary", icon: "fas fa-print"},
            {url:"tools/pdf.html",text:"Pdf",class: "link-success", icon: "fas fa-file-pdf"},
            {url:"tools/fancy.html",text:"Fancy",class: "link-danger", icon: "fas fa-sort-numeric-asc"},
          
        ]
    }
];

document.addEventListener("click", function (e) {
    const link = e.target.closest("#pstatus");
    if (link) {
        e.preventDefault(); // ⛔ stops the page from reloading or jumping

        // 🧠 Get previously searched value from localStorage
        const lastSearch = localStorage.getItem("lastPVR") || "";

        // 📥 Prompt with the previous value prefilled
        const part = prompt("Enter the PVR Number", lastSearch);

        if (part && part.trim() !== "") {
            // 💾 Save to localStorage
            localStorage.setItem("lastPVR", part.trim());

            // 🌐 Open the full URL in new tab
            const fullUrl = "https://eservices.tnpolice.gov.in/CCTNSNICSDC/PVSBarCodeGeneratedData?QRPVRGENECODE=" + part.trim();
            window.open(fullUrl, "_blank");
        }
    }
});


const container = document.getElementById('card-container');
const row = document.createElement('div');
row.className = 'row';

const isTouchDevice = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;

cardData.forEach(card => {
    const colDiv = document.createElement('div');
    colDiv.className = 'col-md-3 mb-4';

    const cardDiv = document.createElement('div');
    cardDiv.className = 'card custom-card';

    const cardBodyDiv = document.createElement('div');
    cardBodyDiv.className = 'card-body';

    const cardTitle = document.createElement('h5');
    cardTitle.className = 'card-title';
    cardTitle.textContent = card.title;

    const ul = document.createElement('ul');
    ul.className = 'custom-links list-unstyled';

    card.links.forEach(link => {
        const li = document.createElement('li');
        li.className = 'position-relative'; // For dropdown positioning

        const a = document.createElement('a');
        a.href = link.url;
        a.className = link.class;
        a.id = link.id || ''; // Optional ID for specific links
        a.target = '_blank';

        const icon = document.createElement('i');
        icon.className = link.icon;
        a.appendChild(icon);

        const text = document.createTextNode(" " + link.text);
        a.appendChild(text);

        li.appendChild(a);

        if (link.additionalLinks && link.additionalLinks.length > 0) {
            const dropdownDiv = document.createElement('div');
            dropdownDiv.className = 'dropdown-menu position-absolute';
            dropdownDiv.style.top = '100%';
            dropdownDiv.style.left = '0';
            dropdownDiv.style.display = 'none';
            dropdownDiv.style.zIndex = '1000';  // ensure on top

            link.additionalLinks.forEach(additionalLink => {
                const dropdownLink = document.createElement('a');
                dropdownLink.target = '_blank';
                dropdownLink.className = 'dropdown-item';
                dropdownLink.href = additionalLink.url;
                dropdownLink.textContent = additionalLink.text;
                dropdownDiv.appendChild(dropdownLink);
            });

            li.appendChild(dropdownDiv);

            if (isTouchDevice) {
                a.addEventListener('click', function(event) {
                    if (dropdownDiv.style.display !== 'block') {
                        event.preventDefault(); // prevent navigation on first tap
                        // close other open dropdowns
                        document.querySelectorAll('.dropdown-menu').forEach(menu => {
                            menu.style.display = 'none';
                        });
                        dropdownDiv.style.display = 'block';
                    } else {
                        // allow navigation on second tap
                    }
                });

                // close dropdown if clicked outside
                document.addEventListener('click', (event) => {
                    if (!li.contains(event.target)) {
                        dropdownDiv.style.display = 'none';
                    }
                });
            } else {
                // Desktop hover using mouseover/mouseout for better support
                li.addEventListener('mouseover', function() {
                    dropdownDiv.style.display = 'block';
                });
                li.addEventListener('mouseout', function() {
                    dropdownDiv.style.display = 'none';
                });
            }
        }

        ul.appendChild(li);
    });

    cardBodyDiv.appendChild(cardTitle);
    cardBodyDiv.appendChild(ul);
    cardDiv.appendChild(cardBodyDiv);
    colDiv.appendChild(cardDiv);
    row.appendChild(colDiv);
});


container.appendChild(row);

window.addEventListener('load', function() {
    setTimeout(function() {
      var loader = document.getElementById('loader');
      loader.style.display = 'none';
    }, 200); // Replace 3000 with the desired timeout value in milliseconds
});

document.addEventListener("DOMContentLoaded", function() {
    const navLinks = document.querySelectorAll(".navbar-nav .nav-link");

    navLinks.forEach(link => {
        link.addEventListener("click", function() {
            // Remove 'active' class from all links
            navLinks.forEach(nav => nav.classList.remove("active"));
            
            // Add 'active' class to the clicked link
            this.classList.add("active");
        });
    });
});



window.addEventListener('load', function() {
    setTimeout(function() {
      var loader = document.getElementById('loader');
      loader.style.display = 'none';
    }, 200); // Replace 3000 with the desired timeout value in milliseconds
  });


  document.addEventListener("DOMContentLoaded", function() {
    const navLinks = document.querySelectorAll(".navbar-nav .nav-link");

    navLinks.forEach(link => {
        link.addEventListener("click", function() {
            // Remove 'active' class from all links
            navLinks.forEach(nav => nav.classList.remove("active"));
            
            // Add 'active' class to the clicked link
            this.classList.add("active");
        });
    });
});


const fancy = [
    1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 22, 33, 44, 55, 66, 77, 81, 88, 99, 100, 101, 123, 222, 234, 333, 345, 444, 456, 555, 567, 666, 678, 777, 
    786, 789, 888, 999, 1000, 1001, 1212, 1234, 1990, 2000, 2002, 2020, 2121, 2222, 2345, 2525, 2626, 2727, 2728, 3000, 3003, 3030, 3333, 
    3456, 4000, 4004, 4040, 4444, 4567, 4777, 5000, 5005, 5050, 5555, 5678, 6000, 6006, 6060, 6666, 6789, 7000, 7007, 7070, 7171, 7172, 
    7337, 7575, 7576, 7777, 8000, 8118, 8181, 8448, 8484, 8586, 8888, 9000, 9009, 9090, 9091, 9097, 9779, 9797, 9999  ];
  

