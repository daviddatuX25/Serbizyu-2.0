/* Shared mockup helpers — loaded on every screen */
function toast(msg){
  let t=document.querySelector('.toast');
  if(!t){t=document.createElement('div');t.className='toast';document.querySelector('.phone').appendChild(t);}
  t.innerHTML='<span>✓</span><span>'+msg+'</span>';
  requestAnimationFrame(()=>t.classList.add('show'));
  clearTimeout(t._h);t._h=setTimeout(()=>t.classList.remove('show'),2200);
}
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-toast]');
  if(b){e.preventDefault();toast(b.dataset.toast);}
});
