/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="it" dir="ltr">
    <Head />
    <Preview>Conferma la tua email per Milano Help</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Benvenuto nella community! 🎉</Heading>
        <Text style={text}>
          Grazie per esserti registrato su{' '}
          <Link href={siteUrl} style={link}>
            <strong>Milano Help</strong>
          </Link>
          , la tua community di quartiere.
        </Text>
        <Text style={text}>
          Conferma il tuo indirizzo email (
          <Link href={`mailto:${recipient}`} style={link}>
            {recipient}
          </Link>
          ) cliccando il pulsante qui sotto:
        </Text>
        <Button style={button} href={confirmationUrl}>
          Conferma la tua email
        </Button>
        <Text style={footer}>
          Se non hai creato un account su Milano Help, puoi ignorare questa email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

const main = { backgroundColor: '#ffffff', fontFamily: '"DM Sans", Arial, sans-serif' }
const container = { padding: '20px 25px' }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: 'hsl(220, 20%, 14%)',
  fontFamily: '"Plus Jakarta Sans", Arial, sans-serif',
  margin: '0 0 20px',
}
const text = {
  fontSize: '14px',
  color: 'hsl(220, 10%, 46%)',
  lineHeight: '1.5',
  margin: '0 0 25px',
}
const link = { color: 'hsl(158, 64%, 36%)', textDecoration: 'underline' }
const button = {
  backgroundColor: 'hsl(158, 64%, 36%)',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: '600' as const,
  borderRadius: '12px',
  padding: '12px 24px',
  textDecoration: 'none',
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
