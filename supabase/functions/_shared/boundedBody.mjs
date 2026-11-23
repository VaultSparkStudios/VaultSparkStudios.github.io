export async function boundedBytes(stream,limit,timeoutMs=10000){
 const reader=stream?.getReader();if(!reader)throw Error('missing_body');
 let timer;const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('read_timeout')),timeoutMs);});
 const chunks=[];let length=0;
 try{for(;;){const part=await Promise.race([reader.read(),timeout]);if(part.done)break;length+=part.value.byteLength;if(length>limit)throw Error('body_too_large');chunks.push(part.value);}}
 finally{clearTimeout(timer);void reader.cancel().catch(()=>{});try{reader.releaseLock();}catch{}}
 const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}return bytes;
}
