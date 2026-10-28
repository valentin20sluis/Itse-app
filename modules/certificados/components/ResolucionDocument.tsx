import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { ResolucionPdfData } from "@/modules/certificados/services/resolucion-pdf.service";
import { RIESGO_LABELS } from "@/modules/expedientes/constants/expediente-labels";
import { formatFecha } from "@/modules/expedientes/utils/format-fecha";

const styles = StyleSheet.create({
  page: { padding: 48, fontFamily: "Helvetica", fontSize: 11, color: "#1a1a1a", lineHeight: 1.5 },
  title: { fontSize: 16, fontFamily: "Helvetica-Bold", textAlign: "center", marginBottom: 4 },
  numero: { textAlign: "center", marginBottom: 4 },
  fecha: { textAlign: "center", marginBottom: 24 },
  parrafo: { marginBottom: 10, textAlign: "justify" },
  negrita: { fontFamily: "Helvetica-Bold" },
  firma: { marginTop: 80, alignItems: "center" },
  firmaLinea: { width: 220, borderTopWidth: 1, borderTopColor: "#1a1a1a", paddingTop: 4, textAlign: "center" },
  pie: { position: "absolute", bottom: 28, left: 48, right: 48, fontSize: 9, textAlign: "center", color: "#555555" },
});

export function ResolucionDocument({ data }: { data: ResolucionPdfData }) {
  const { establecimiento: est, solicitante } = data;
  const quien = solicitante.razonSocial
    ? `${solicitante.nombre} (${solicitante.razonSocial})`
    : solicitante.nombre || "el solicitante";
  return (
    <Document title={`Resolución Gerencial ${data.resolucionNumero}`}>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Resolución Gerencial</Text>
        <Text style={styles.numero}>N.° {data.resolucionNumero}</Text>
        <Text style={styles.fecha}>Fecha: {formatFecha(data.resolucionAt)}</Text>

        <Text style={styles.parrafo}>
          Visto el expediente {data.expedienteNumero} presentado por {quien}, y habiéndose verificado que el
          establecimiento cumple con las condiciones de seguridad exigidas, se resuelve:
        </Text>
        <Text style={styles.parrafo}>
          <Text style={styles.negrita}>Aprobar</Text> el Certificado de Inspección Técnica de Seguridad en
          Edificaciones N.° {data.certificadoNumero} a favor de {quien}, para el establecimiento{" "}
          {est.nombreComercial}, ubicado en {est.direccion}, {est.distrito}, giro {est.giro}, con nivel de
          riesgo {RIESGO_LABELS[data.nivelRiesgo].toLowerCase()}.
        </Text>
        <Text style={styles.parrafo}>
          El certificado fue expedido el {formatFecha(data.emitidoAt)} y tiene vigencia hasta el{" "}
          {formatFecha(data.venceAt)}.
        </Text>

        <View style={styles.firma}>
          <Text style={styles.firmaLinea}>Jefe de GRDyDC</Text>
          {data.jefeNombre ? <Text>{data.jefeNombre}</Text> : null}
        </View>

        <Text style={styles.pie} fixed>
          Proyecto académico. Documento sin validez oficial.
        </Text>
      </Page>
    </Document>
  );
}
