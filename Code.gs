// Se reemplaza la API_KEY 
var API_KEY = "AIzaSyC19ZEFCLqctgcjuexvl00KDWFlt8DxCN0"; 

//Funcion de recepción de datos o puerto de entrada
function doPost(e) {
  // Conversion del cuerpo del mensaje
  var datos = JSON.parse(e.postData.contents);
  //Accede al documento u hoja sheet
  var hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Feedback");
  var fechaHora = new Date();
  // Inserta una nueva fila con los datos básicos recibidos del formulario
  hoja.appendRow([
    fechaHora,
    datos.producto,
    datos.comentario,
    datos.nombre || "Anónimo", // Si no hay nombre se añade como anonimo
    // Las columnas E y F se añaden automáticamente desde la conexión con la IA
    "", // Columna E: Sentimiento
    ""  // Columna F: Resumen
  ]);

  // Obtiene el número de la fila que se ha creado
  var ultimaFila = hoja.getLastRow();
  // Llama a la función que conecta con la IA de Google
  analizarConGemini(ultimaFila, datos.comentario);

  // Responde al formulario HTML con "ok" para confirmar recepción
  return ContentService.createTextOutput("ok");
}

function analizarConGemini(numeroFila, comentario) {
  // Endpoint de la API.
 var url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + API_KEY;
  // Aseguramos que no se use Markdown (```json) 
  // para que el texto sea fácil de convertir en objeto directamente.
  var instruccion = "Analiza este comentario de cliente y responde ESTRICTAMENTE en formato JSON plano, " +
                    "sin bloques de código markdown: " +
                    "{\"sentimiento\":\"Positivo|Neutro|Negativo\",\"resumen\":\"resumen corto\"}. " +
                    "Comentario: " + comentario;
  // Estructura de datos que requiere Google para procesar la petición
  var cuerpo = {
    contents: [{
      parts: [{ text: instruccion }]
    }]
  };
  // Configuración de la petición HTTP
  var opciones = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(cuerpo),
    muteHttpExceptions: true
  };

  try {
    // Realiza la llamada a los servidores de Google
    var respuesta = UrlFetchApp.fetch(url, opciones);
    var respuestaTexto = respuesta.getContentText();
    var resultado = JSON.parse(respuestaTexto);

    // Si la API devuelve un error
    if (resultado.error) {
      Logger.log("Error de la API (" + resultado.error.code + "): " + resultado.error.message);
      return;
    }

    // Si la IA respondió correctamente
    if (resultado.candidates && resultado.candidates[0].content) {
      var textoRespuesta = resultado.candidates[0].content.parts[0].text;
      
      // Limpiador de seguridad por si la IA devuelve ```json ... ```
      var jsonLimpio = textoRespuesta.replace(/```json|```/g, "").trim();
      var analisis = JSON.parse(jsonLimpio);

      var hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Feedback");
      
      // Escribimos Sentimiento (Col E) y Resumen (Col F)
      hoja.getRange(numeroFila, 5).setValue(analisis.sentimiento);
      hoja.getRange(numeroFila, 6).setValue(analisis.resumen);

      // Colores automáticos
      var celda = hoja.getRange(numeroFila, 5);
      var colores = { "Positivo": "#c6efce", "Negativo": "#ffc7ce", "Neutro": "#ffeb9c" };
      celda.setBackground(colores[analisis.sentimiento] || "#ffffff");
      
      Logger.log("Fila " + numeroFila + " analizada con éxito.");
    }

  } catch (error) {
    Logger.log("Error en el proceso: " + error.toString());
  }
}

// Verificacion de modelos
/*
function verModelos() {
  var url = "https://generativelanguage.googleapis.com/v1beta/models?key=" + API_KEY;
  var respuesta = UrlFetchApp.fetch(url);
  Logger.log(respuesta.getContentText());
}
*/

// Pruebas de inserción de datos
/*
function probar() {
  var hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Feedback");
  if (!hoja) {
    SpreadsheetApp.getActiveSpreadsheet().insertSheet("Feedback");
  }
  
  var comentarioPrueba = "La interfaz es increíble, pero el soporte técnico tardó dos días en responder.";
  hoja.appendRow([new Date(), "Prueba Manual", comentarioPrueba, "Usuario Test", "", ""]);
  
  analizarConGemini(hoja.getLastRow(), comentarioPrueba);
  Logger.log("Prueba ejecutada. Revisa la última fila de la hoja 'Feedback'.");
}
*/