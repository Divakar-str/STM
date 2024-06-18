const cardData = [
    {
        title: "Driving License",
        links: [
            { url: "https://sarathi.parivahan.gov.in/", text: "Sarathi", class: "link-primary", icon: "fas fa-car" },
            { url: "https://sarathi.parivahan.gov.in/paymentscov/", text: "Fees Payment", class: "link-success", icon: "fas fa-money-bill-wave" },
            { url: "https://sarathi.parivahan.gov.in/cas/login?service=https%3A%2F%2Fsarathi.parivahan.gov.in%2Fsarathi%2Flogin.do", text: "Sarathi login", class: "link-danger", icon: "fas fa-sign-in-alt" },
            { url: "https://flagday.tn.gov.in/", text: "Flag", class: "link-info", icon: "fas fa-flag" }
        ]
    },
    {
        title: "Vehicle",
        links: [
            { url: "https://parivahan.gov.in/parivahan/", text: "Parivahan", class: "link-primary", icon: "fas fa-road" },
            { url: "https://vahan.parivahan.gov.in/vahanservice/vahan/ui/statevalidation/homepage.xhtml", text: "Vahan", class: "link-success", icon: "fas fa-truck" },
            { url: "https://vahan.parivahan.gov.in/appointment/vahan/ui/userpanel/bookappoinment.xhtml", text: "Appointment", class: "link-danger", icon: "fas fa-id-card" },
            { url: "https://vahan.parivahan.gov.in/vahan/vahan/ui/login/login.xhtml", text: "Online Payment", class: "link-info", icon: "fa fa-money-bill" }
        ]
    },
   
    {
        title: "NP permit",
        links: [
            { url: "https://vahan.parivahan.gov.in/npermit/faces/np/jsp/nationalpermit.jsp", text: "NP Permit Home", class: "link-primary", icon: "fas fa-id-card" },
            { url: "https://vahan.parivahan.gov.in/npermit/faces/np/jsp/nationalpermit.jsp", text: "Permit Pay", class: "link-success", icon: "fas fa-receipt" },
            { url: "https://vahan.parivahan.gov.in/npermit/faces/np/jsp/printpermitreceipt.jsp", text: "Print Receipt", class: "link-danger", icon: "fas fa-print" },
            { url: "https://vahan.parivahan.gov.in/npermit/faces/np/jsp/checktransaction.jsp", text: "Fail check", class: "link-info", icon: "fas fa-exclamation-triangle" }
            
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
            { url: "https://online.canarabank.in/?module=login", text: "Canara", class: "link-danger", icon: "fas fa-landmark" },

        ]
    },
    {
        title: "Social",
        links: [
            { url: "https://www.facebook.com/", text: "Facebook", class: "link-primary", icon: "fab fa-facebook" },
            { url: "https://www.instagram.com/", text: "Instagram", class: "link-success", icon: "fab fa-instagram" },
            { url: "https://twitter.com/", text: "Twitter", class: "link-danger", icon: "fab fa-twitter" },
            { url: "https://www.linkedin.com/", text: "Linkedin", class: "link-info", icon: "fab fa-linkedin" }
        ]
    },
    {
        title: "Mail",
        links: [
            { url: "https://mail.google.com/mail/u/0/#inbox", text: "Gmail", class: "link-primary", icon: "fas fa-envelope" },
            { url: "https://outlook.live.com/mail/0/inbox", text: "Outlook", class: "link-success", icon: "fas fa-envelope-open-text" },
            { url: "https://mail.yahoo.com/", text: "Yahoo", class: "link-danger", icon: "fas fa-envelope-open" },
            { url: "https://mail.protonmail.com/login", text: "Proton", class: "link-info", icon: "fas fa-envelope-square" }
        ]
    }
];

const container = document.getElementById('card-container');
const row = document.createElement('div');
row.className = 'row';

cardData.forEach(card => {
    const colDiv = document.createElement('div');
    colDiv.className = ' col-md-3 mb-4';

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
        const a = document.createElement('a');
        a.href = link.url;
        a.className = link.class;
        a.target = '_blank';

        const icon = document.createElement('i');
        icon.className = link.icon;
        a.appendChild(icon);

        const text = document.createTextNode(" " + link.text);
        a.appendChild(text);

        li.appendChild(a);
        ul.appendChild(li);
    });

    cardBodyDiv.appendChild(cardTitle);
    cardBodyDiv.appendChild(ul);
    cardDiv.appendChild(cardBodyDiv);
    colDiv.appendChild(cardDiv);
    row.appendChild(colDiv);
});

container.appendChild(row);
