document.addEventListener('DOMContentLoaded', function() {

  // Use buttons to toggle between views
  document.querySelector('#inbox').addEventListener('click', () => load_mailbox('inbox'));
  document.querySelector('#sent').addEventListener('click', () => load_mailbox('sent'));
  document.querySelector('#archived').addEventListener('click', () => load_mailbox('archive'));
  document.querySelector('#compose').addEventListener('click', compose_email);

  // extract the submit button of the compose form and add an event listener
  document.querySelector('#compose-form').addEventListener('submit', SendMail);


  // By default, load the inbox
  load_mailbox('inbox');
});


function compose_email() {
  // Show compose view and hide other views
  document.querySelector('#emails-view').style.display = 'none';
  document.querySelector('#display-email').style.display = 'none';
  document.querySelector('#compose-view').style.display = 'block';

  // Clear out composition fields
  document.querySelector('#compose-recipients').value = '';
  document.querySelector('#compose-subject').value = '';
  document.querySelector('#compose-body').value = '';

  // Remove any validation messages
  document.querySelector("#compose-result").innerHTML ='';
  document.querySelector("#compose-result").style.display ='none';
}


function load_mailbox(mailbox) {
  // Show the mailbox and hide other views
  document.querySelector('#emails-view').style.display = 'block';
  document.querySelector('#display-email').style.display = 'none';
  document.querySelector('#compose-view').style.display = 'none';

  // Show the mailbox name
  document.querySelector('#emails-view').innerHTML = `<h3>${mailbox.charAt(0).toUpperCase() + mailbox.slice(1)}</h3>`;

  // When a user visits their Inbox, Sent mailbox, or Archive, load the appropriate mailbox
  getEmails(mailbox);
}


function SendMail(event) {
  event.preventDefault();

  // capture the respective inputs of the form
  const recipients = document.querySelector('#compose-recipients').value;
  const subject = document.querySelector('#compose-subject').value;
  const body = document.querySelector('#compose-body').value;

  // Makes POST request to send email using form fields
  fetch('/emails', {
    method: 'POST',
    body: JSON.stringify({
        recipients: recipients,
        subject: subject,
        body: body
    })
  })
  .then(response => response.json())
  .then(result => {
      // Print result
      //console.log(result);
      
      // If successful, load user's sent inbox
      if (!result.error) {
        load_mailbox('sent');
      } else {
        // else display an error message
        document.querySelector("#compose-result").innerHTML = result.error;
        document.querySelector("#compose-result").style.display = 'block';
        scroll(0,0);
      }
  })
}


async function getEmails(mailbox) {

  // Waits for the email JSON data
  const emails = await apiCall(mailbox);

  // If email in the mailbox
  if (emails.length === 0) {
    const noResults = document.createElement('div');
    noResults.innerHTML = "You don't have any emails under this mailbox at the moment.";
    document.getElementById('emails-view').appendChild(noResults);
  }

  // iterate over the JSON email data from apiCall
  emails.forEach((singleEmail) => {

    // Adds a new div for each email in the mailbox
    const emailDiv = document.createElement('div');

    let column = (mailbox == "sent") ? `<strong>To: ${singleEmail.recipients}</strong>` : `From: ${singleEmail.sender}`;
  
    emailDiv.innerHTML = `
      <div class="col-6 col-sm-7 col-md-4 p-2 text-truncate">${column}</div>
      <div class="col-6 col-sm-7 col-md-4 p-2 order-md-2 small text-right text-muted align-self-center">${singleEmail.timestamp}</div>
      <div class="col px-2 pb-2 pt-md-2 order-md-1 text-truncate">${singleEmail.subject}</div>
    `;
    
    emailDiv.className = 'row justify-content-between border border-left-0 border-right-0 border-bottom-0 pointer-link p-2';
    
    // If the email is unread, it should appear with a white background. If the email has been read, it should appear with a gray background.
    if (singleEmail.read == true) {
      emailDiv.style.backgroundColor = '#D3D3D3';
    } else {
      emailDiv.classList.add('font-weight-bold');
    }

    // the event listener leads the user to mark an email as read
    emailDiv.addEventListener('click', function() {
      open_an_EMail(singleEmail, mailbox);
    })
    
    // Adds email div to the mailbox page
    document.getElementById('emails-view').appendChild(emailDiv);
  });
}


// Fetches email JSON data for a given mailbox from backend database
async function apiCall(mailbox) {
  const response = await fetch(`/emails/${mailbox}`);
  const emailData = await response.json();
  return emailData
}


function open_an_EMail(email, mailbox) {
  if(email.read != true) {
    // this function sends an api "PUT" request to the backend to register the email as read
    readEmail(email)
  }
  // displays a single email to the user with archive and reply button
  displayEmail(email, mailbox)
}


async function readEmail(email) {
  // PUT (/emails/<int:email_id>)
  fetch(`/emails/${email.id}`, {
    method: 'PUT', 
    body: JSON.stringify({
      read: true
    })
  });
}


function displayEmail(email, mailbox) {
  // Clear out composition fields and emails-view id
  document.querySelector('#emails-view').style.display = 'none';
  document.querySelector('#compose-view').style.display = 'none';
  document.querySelector('#display-email').style.display = 'block';

  display = document.querySelector('#display-email');
  display.innerHTML = `
  <div class="d-flex justify-content-between flex-nowrap-sm flex-wrap">
    <h5 class="text-wrap">${email.subject}</h5>
    <small class="mr-lg-4 ml-0 ml-sm-2 font-weight-lighter align-self-center text-muted text-right"><em>${email.timestamp}</em></small>
  </div>
  <div class="d-flex justify-content-between py-3 pt-md-2 border-bottom flex-wrap">
    <div>
      <strong>From:</strong> ${email.sender}<br>
      <strong>To:</strong> ${email.recipients}<br>
    </div>
    <div class="text-nowrap mr-lg-4 ml-0 ml-sm-2" id="buttons">
    </div>
  </div>
  <div class="pt-1" style="white-space: pre-line">
    ${email.body}
  </div>
  `

  //extract div of the button created with id of buttons
  let button = document.getElementById('buttons')
  // add reply button if the mailbox isn't sent mailbox
  if (mailbox != 'sent') {

    // create reply button
    const element = document.createElement('button');
    element.innerHTML = '<i class="fas fa-reply"></i>';
    element.type = 'button';
    element.className = 'btn btn-outline-dark btn-sm mr-1';

    // add reply button to DOM
    button.appendChild(element);

    // on clicking replyEmail take uset to the compose email form for 'replyEmail mode'
    element.addEventListener('click', function() {
        // calls the compose_email function to compose the fields for POSTing a new email to backend
        compose_email();

        // Allow users to reply to an email and prepopulates fields when in "reply" mode
        reply_email(email);
    });
  }

  // Add archive button 
  const element2 = document.createElement('button');

  const buttonText = email.archived ? "Unarchive" : "Archive"
  element2.innerHTML = buttonText;
  element2.type = 'button';
  element2.className = 'btn btn-outline-dark btn-sm';

  // add archive button to DOM
  button.appendChild(element2);

  // clicking the archive or unarchive button archives or unarchives the email
  element2.addEventListener('click', function() {
      archive(email);
  });
}


// archives or unarchives an email
async function archive(email) {
  // waits for the status of 'archived'
  await fetch(`/emails/${ email.id }`, {
    method: 'PUT',
    body: JSON.stringify({
      // acts as a switch to toggle between archived and unarchived.
      archived: !email.archived
    })
  })

  // returns inbox
  return load_mailbox('archive');
}


function reply_email(email) {
  // for the 'Re:' keyword before the subject of the email
  let subject = email.subject
  if (subject.slice(0,3) == 'Re:') {
    email.subject
  } else {
    `'Re:' ${email.subject}`
  }
  document.querySelector('#compose-recipients').value = email.sender;
  document.querySelector('#compose-subject').value = subject;
  document.querySelector('#compose-body').value = `On ${ email.timestamp} ${ email.recipients } wrote: ${email.body}`;
}