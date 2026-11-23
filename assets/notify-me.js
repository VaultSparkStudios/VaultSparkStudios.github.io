/* Project-specific confirmed email interest; no product access is granted. */
(function(){'use strict';
document.querySelectorAll('form.notify-me-form').forEach(function(form){
 var feedback=form.querySelector('.notify-me-feedback'),button=form.querySelector('[type=submit]'),email=form.querySelector('[type=email]');
 if(!feedback||!button||!email)return;
 feedback.setAttribute('role','status');feedback.setAttribute('aria-live','polite');
 form.addEventListener('submit',async function(event){event.preventDefault();if(button.disabled||!form.reportValidity())return;
  var label=button.textContent,timer;button.disabled=true;button.textContent='Requesting…';feedback.hidden=false;feedback.textContent='Checking your request…';
  try{
   if(!window.VSTurnstile?.consumeToken)throw Error('verification_unavailable');
   var token=await Promise.race([window.VSTurnstile.consumeToken(form.querySelector('.turnstile-slot')),new Promise(function(_,reject){timer=setTimeout(function(){reject(Error('verification_timeout'));},15000);})]);clearTimeout(timer);
   var response=await fetch('/api/project-waitlist',{method:'POST',credentials:'omit',headers:{'content-type':'application/json'},body:JSON.stringify({action:'request',project:form.dataset.project,email:email.value.trim(),turnstileToken:token}),signal:AbortSignal.timeout(35000)});
   var body=await response.json();if(!response.ok||body.ok!==true||body.state!=='pending-confirmation'||body.project!==form.dataset.project)throw Error('unverified');
   feedback.textContent='Check your email to confirm this project interest. This request does not grant access or reserve a launch date.';
  }catch(_){feedback.textContent='Your request could not be verified. Check for an existing confirmation email, then try again if needed.';}
  finally{clearTimeout(timer);button.disabled=false;button.textContent=label;}
 });
});})();
