import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer';
import { format } from 'date-fns';

// Register fonts
Font.register({
  family: 'Roboto',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/roboto/v27/KFOmCnqEu92Fr1Mu4mxP.ttf', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/roboto/v27/KFOlCnqEu92Fr1MmWUlfBBc9.ttf', fontWeight: 700 },
  ],
});

// Create styles
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 40,
    fontFamily: 'Roboto',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40,
  },
  logo: {
    width: 120,
    height: 50,
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    marginBottom: 20,
    color: '#1a365d',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 700,
    marginBottom: 10,
    color: '#2c5282',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  label: {
    width: 150,
    fontWeight: 700,
    color: '#4a5568',
  },
  value: {
    flex: 1,
    color: '#2d3748',
  },
  table: {
    marginTop: 10,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingVertical: 8,
  },
  tableHeader: {
    backgroundColor: '#f7fafc',
    fontWeight: 700,
  },
  tableCell: {
    flex: 1,
    padding: 5,
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 40,
    right: 40,
    textAlign: 'center',
    color: '#718096',
    fontSize: 10,
  },
  watermark: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%) rotate(-45deg)',
    fontSize: 60,
    color: 'rgba(0, 0, 0, 0.05)',
  },
});

interface PolicyDocumentProps {
  policy: any;
}

export const PolicyDocument: React.FC<PolicyDocumentProps> = ({ policy }) => {
  const {
    policyNumber,
    effectiveDate,
    expiryDate,
    customer,
    plan,
    premium,
    status,
  } = policy;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Watermark */}
        <Text style={styles.watermark}>
          {status === 'ACTIVE' ? 'ORIGINAL' : status}
        </Text>

        {/* Header */}
        <View style={styles.header}>
          <Image
            style={styles.logo}
            src={plan.insurer.logoUrl || '/icon.svg'}
          />
          <View>
            <Text>Policy Number: {policyNumber}</Text>
            <Text>Date: {format(new Date(), 'dd/MM/yyyy')}</Text>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>Health Insurance Policy Certificate</Text>

        {/* Policy Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Policy Details</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Policy Number:</Text>
            <Text style={styles.value}>{policyNumber}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Plan Name:</Text>
            <Text style={styles.value}>{plan.name}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Insurer:</Text>
            <Text style={styles.value}>{plan.insurer.name}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Status:</Text>
            <Text style={styles.value}>{status}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Effective Date:</Text>
            <Text style={styles.value}>
              {format(new Date(effectiveDate), 'dd/MM/yyyy')}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Expiry Date:</Text>
            <Text style={styles.value}>
              {format(new Date(expiryDate), 'dd/MM/yyyy')}
            </Text>
          </View>
        </View>

        {/* Policyholder Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Policyholder Details</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Name:</Text>
            <Text style={styles.value}>
              {customer.firstName} {customer.lastName}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Email:</Text>
            <Text style={styles.value}>{customer.user.email}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Phone:</Text>
            <Text style={styles.value}>{customer.phone}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Address:</Text>
            <Text style={styles.value}>
              {customer.address}, {customer.city}, {customer.state}
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};
