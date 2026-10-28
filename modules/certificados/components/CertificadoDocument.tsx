import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { CertificadoPdfData } from "@/modules/certificados/services/certificado-pdf.service";
import { formatCodigo } from "@/modules/certificados/utils/certificado-codigo";
import { RIESGO_LABELS } from "@/modules/expedientes/constants/expediente-labels";
import { formatFecha } from "@/modules/expedientes/utils/format-fecha";

const styles = StyleSheet.create({
  page: { padding: 48, fontFamily: "Helvetica", fontSize: 11, color: "#1a1a1a" },
  borrador: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    color: "#b45309",
    borderWidth: 1.5,
    borderColor: "#b45309",
    padding: 6,
    marginBottom: 16,
  },
  title: { fontSize: 15, fontFamily: "Helvetica-Bold", textAlign: "center", marginBottom: 4 },
  numero: { textAlign: "center", marginBottom: 20 },
  row: { flexDirection: "row", marginBottom: 6 },
  label: { width: 140, fontFamily: "Helvetica-Bold" },
  value: { flex: 1 },
  verificacion: { marginTop: 24, flexDirection: "row", alignItems: "center" },
  qr: { width: 110, height: 110 },
  verificacionTexto: { flex: 1, marginLeft: 16 },
  negrita: { fontFamily: "Helvetica-Bold" },
  url: { fontSize: 9, color: "#555555" },
  firma: { marginTop: 60, alignItems: "center" },
  firmaLinea: { width: 220, borderTopWidth: 1, borderTopColor: "#1a1a1a", paddingTop: 4, textAlign: "center" },
  pie: { position: "absolute", bottom: 28, left: 48, right: 48, fontSize: 9, textAlign: "center", color: "#555555" },
});

const PENDIENTE_FECHA = "Se definen al aprobar";

function Fila({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

type Props = { data: CertificadoPdfData; qrDataUrl: string; urlVerificacion: string };

export function CertificadoDocument({ data, qrDataUrl, urlVerificacion }: Props) {
  const { establecimiento: est, solicitante } = data;
  const quien = solicitante.razonSocial
    ? `${solicitante.nombre} (${solicitante.razonSocial})`
    : solicitante.nombre;
  return (
    <Document title={`Certificado ${data.numero}`}>
      <Page size="A4" style={styles.page}>
        {data.borrador ? (
          <Text style={styles.borrador} fixed>
            BORRADOR — PENDIENTE DE APROBACIÓN
          </Text>
        ) : null}
        <Text style={styles.title}>Certificado de Inspección Técnica de Seguridad en Edificaciones</Text>
        <Text style={styles.numero}>N.° {data.numero}</Text>

        <Fila label="Tipo de ITSE" value={data.tipoItse === "PREVIA" ? "Previa" : "Posterior"} />
        <Fila label="Nivel de riesgo" value={RIESGO_LABELS[data.nivelRiesgo]} />
        <Fila label="Solicitante" value={quien} />
        <Fila label="Establecimiento" value={est.nombreComercial} />
        <Fila label="Dirección" value={est.direccion} />
        <Fila label="Distrito" value={est.distrito} />
        <Fila label="Giro" value={est.giro} />
        <Fila label="Área" value={`${Number(est.areaM2)} m²`} />
        <Fila label="Fecha de expedición" value={data.emitidoAt ? formatFecha(data.emitidoAt) : PENDIENTE_FECHA} />
        <Fila label="Fecha de vencimiento" value={data.venceAt ? formatFecha(data.venceAt) : PENDIENTE_FECHA} />

        <View style={styles.verificacion} wrap={false}>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- Image de react-pdf, no es un <img> HTML */}
          <Image src={qrDataUrl} style={styles.qr} />
          <View style={styles.verificacionTexto}>
            <Text>
              Código de verificación: <Text style={styles.negrita}>{formatCodigo(data.codigo)}</Text>
            </Text>
            <Text>Escanea el código QR o ingresa a:</Text>
            <Text style={styles.url}>{urlVerificacion}</Text>
          </View>
        </View>

        <View style={styles.firma}>
          <Text style={styles.firmaLinea}>Jefe de GRDyDC</Text>
          {data.borrador ? <Text>Pendiente de aprobación</Text> : null}
          {data.jefeNombre ? <Text>{data.jefeNombre}</Text> : null}
        </View>

        <Text style={styles.pie} fixed>
          Proyecto académico. Documento sin validez oficial.
        </Text>
      </Page>
    </Document>
  );
}
