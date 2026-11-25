const PRODUCTS = [
  {id:"HF001",name:"น้ำผึ้งดอกลำไย",weight:"250 กรัม",price:129,desc:"กลิ่นหอมละมุน รสหวานกลมกล่อม",label:"LONGAN HONEY",emoji:"🌼"},
  {id:"HF002",name:"น้ำผึ้งดอกไม้ป่า",weight:"500 กรัม",price:229,desc:"รสชาติเป็นเอกลักษณ์ เหมาะสำหรับทุกวัน",label:"WILDFLOWER HONEY",emoji:"🌻"}
];
const API_URL = ""; // วาง URL ของ Google Apps Script Web App ที่นี่หลัง Deploy
let cart = JSON.parse(localStorage.getItem("hf_cart")||"{}");
let orders = JSON.parse(localStorage.getItem("hf_orders")||"[]");
let selectedOrder = null;
const money = n => "฿"+Number(n).toLocaleString("th-TH");
function showView(view){
  document.getElementById("shop-view").classList.toggle("hidden",view!=="shop");
  document.getElementById("admin-view").classList.toggle("hidden",view!=="admin");
  document.querySelectorAll(".nav-link").forEach(b=>b.classList.toggle("active",b.dataset.view===view));
  if(view==="admin")loadOrders();
  window.scrollTo(0,0);
}
document.querySelectorAll(".nav-link").forEach(b=>b.addEventListener("click",()=>showView(b.dataset.view)));
function renderProducts(){
  document.getElementById("product-grid").innerHTML=PRODUCTS.map((p,i)=>`
    <article class="product-card"><div class="product-art"><span class="flower f1">${p.emoji}</span><div class="jar"><span>${p.label}<br>HONEY FARM</span></div><span class="flower f2">✿</span></div>
    <div class="product-info"><small>${p.id} · ${p.weight}</small><h3>${p.name}</h3><p>${p.desc}</p><div class="product-bottom"><b class="price">${money(p.price)}</b><button class="add" onclick="addToCart('${p.id}')">+ เพิ่มลงตะกร้า</button></div></div></article>`).join("");
}
function saveCart(){localStorage.setItem("hf_cart",JSON.stringify(cart));renderCartCount()}
function renderCartCount(){document.getElementById("cart-count").textContent=Object.values(cart).reduce((a,b)=>a+b,0)}
function addToCart(id){cart[id]=(cart[id]||0)+1;saveCart();toast("เพิ่มสินค้าลงตะกร้าแล้ว")}
function cartRows(){return PRODUCTS.filter(p=>cart[p.id]).map(p=>({ ...p,qty:cart[p.id]}))}
function total(){return cartRows().reduce((s,p)=>s+p.price*p.qty,0)}
function openCart(){renderCart();document.getElementById("cart-modal").classList.remove("hidden")}
function closeCart(){document.getElementById("cart-modal").classList.add("hidden")}
function renderCart(){
 const rows=cartRows();
 document.getElementById("cart-items").innerHTML=rows.length?rows.map(p=>`<div class="cart-row"><div><b>${p.name}</b><br><small>${money(p.price)} / ชิ้น</small></div><div class="qty"><button onclick="changeQty('${p.id}',-1)">−</button>${p.qty}<button onclick="changeQty('${p.id}',1)">+</button></div><b>${money(p.price*p.qty)}</b></div>`).join(""):'<p class="empty">ยังไม่มีสินค้าในตะกร้า</p>';
 document.getElementById("cart-total").textContent=money(total());
}
function changeQty(id,n){cart[id]=(cart[id]||0)+n;if(cart[id]<=0)delete cart[id];saveCart();renderCart()}
function showCheckout(){if(!cartRows().length){toast("กรุณาเลือกสินค้าก่อน");return}closeCart();document.getElementById("checkout-total").textContent=money(total());document.getElementById("checkout-modal").classList.remove("hidden")}
function closeCheckout(){document.getElementById("checkout-modal").classList.add("hidden")}
function toast(msg){const el=document.getElementById("toast");el.textContent=msg;el.classList.add("show");setTimeout(()=>el.classList.remove("show"),2400)}
function persistOrders(){localStorage.setItem("hf_orders",JSON.stringify(orders))}
async function sendToSheet(action,payload){
 if(!API_URL)return {local:true};
 try{await fetch(API_URL,{method:"POST",mode:"no-cors",headers:{"Content-Type":"application/json"},body:JSON.stringify({action,...payload})});return {sent:true}}
 catch(e){return {local:true,error:true}}
}
document.getElementById("checkout-form").addEventListener("submit",async e=>{
 e.preventDefault();const fd=new FormData(e.target);const items=cartRows();const now=new Date();
 const order={id:"HF"+now.getTime().toString().slice(-8),date:now.toLocaleString("th-TH"),name:fd.get("name"),phone:fd.get("phone"),address:fd.get("address"),note:fd.get("note"),items:items.map(p=>({sku:p.id,name:p.name,qty:p.qty,price:p.price})),total:total(),status:"รอหยิบสินค้า"};
 orders.unshift(order);persistOrders();await sendToSheet("newOrder",{order});
 cart={};saveCart();e.target.reset();closeCheckout();toast("รับคำสั่งซื้อแล้ว เลขที่ "+order.id);showView("admin");
});
async function loadOrders(){
 if(API_URL){
  document.getElementById("connection-state").textContent="● เชื่อมต่อ Google Sheets (กำลังโหลด)";
  try{const r=await fetch(API_URL+"?action=getOrders");const d=await r.json();if(Array.isArray(d.orders)){orders=d.orders;persistOrders()}document.getElementById("connection-state").textContent="● Google Sheets";}
  catch(e){document.getElementById("connection-state").textContent="● แสดงข้อมูลในอุปกรณ์นี้";}
 }else document.getElementById("connection-state").textContent="● โหมดตัวอย่าง · ยังไม่เชื่อม Google Sheets";
 renderOrders();
}
function renderOrders(){
 document.getElementById("stats").innerHTML=[["ออเดอร์ทั้งหมด",orders.length],["รอจัดส่ง",orders.filter(o=>o.status!=="จัดส่งแล้ว").length],["ยอดขายรวม",money(orders.reduce((s,o)=>s+Number(o.total||0),0))]].map(x=>`<div class="stat"><small>${x[0]}</small><b>${x[1]}</b></div>`).join("");
 document.getElementById("empty-orders").classList.toggle("hidden",orders.length>0);
 document.getElementById("orders-body").innerHTML=orders.map(o=>`<tr><td><b>${o.id}</b><br><small>${o.date||""}</small></td><td>${escapeHtml(o.name)}<br><small>${escapeHtml(o.phone)}</small></td><td>${(o.items||[]).map(i=>`${escapeHtml(i.name)} × ${i.qty}`).join("<br>")}</td><td><b>${money(o.total)}</b></td><td><span class="status">${o.status}</span></td><td><button class="small-btn" onclick="selectOrder('${o.id}')">หยิบ/แพ็ก</button></td></tr>`).join("");
}
function escapeHtml(s){return String(s||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function selectOrder(id){
 selectedOrder=orders.find(o=>o.id===id);if(!selectedOrder)return;
 const o=selectedOrder;
 document.getElementById("fulfillment").innerHTML=`<div class="fulfillment-card" id="fulfillment-print"><h3>ใบหยิบสินค้า / PACKING LIST</h3><b>Order: ${o.id}</b><p>ลูกค้า: ${escapeHtml(o.name)} · โทร. ${escapeHtml(o.phone)}</p><p>วันที่: ${o.date||"-"}</p><hr><b>รายการที่ต้องหยิบ</b>${(o.items||[]).map(i=>`<p>□ ${escapeHtml(i.name)} (${i.sku}) — <b>${i.qty} ชิ้น</b></p>`).join("")}<hr><b>ที่อยู่จัดส่ง</b><p>${escapeHtml(o.name)}<br>${escapeHtml(o.address)}<br>โทร. ${escapeHtml(o.phone)}</p><p>หมายเหตุ: ${escapeHtml(o.note||"-")}</p><h3>ยอดรวม ${money(o.total)}</h3><div class="fulfillment-actions"><button onclick="printLabel()">พิมพ์ใบจ่าหน้า / ใบหยิบ</button><button onclick="setStatus('${o.id}','กำลังแพ็กสินค้า')">เริ่มแพ็ก</button><button onclick="setStatus('${o.id}','จัดส่งแล้ว')">ทำเครื่องหมายจัดส่งแล้ว</button></div></div>`;
}
async function setStatus(id,status){const o=orders.find(x=>x.id===id);if(!o)return;o.status=status;persistOrders();await sendToSheet("updateStatus",{id,status});renderOrders();selectOrder(id);toast("อัปเดตสถานะแล้ว")}
function printLabel(){const el=document.getElementById("fulfillment-print");if(!el)return;const w=window.open("","_blank","width=700,height=800");w.document.write(`<html><head><title>Shipping label</title><style>body{font-family:Arial,sans-serif;padding:35px;line-height:1.7}.label{border:2px solid #222;padding:25px;margin-bottom:25px}.big{font-size:24px;font-weight:bold}</style></head><body><div class="label"><div class="big">HONEY FARM · ใบจ่าหน้าพัสดุ</div>${el.innerHTML.replace(/<div class="fulfillment-actions">[\\s\\S]*?<\\/div>/,"")}</div><script>window.print()<\\/script></body></html>`);w.document.close()}
renderProducts();renderCartCount();
