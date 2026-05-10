export default function SignInSentPage(): React.ReactElement {
  return (
    <main>
      <h1>Check your email</h1>
      <p>
        A magic link is on its way. Click it to sign in. The link expires in
        15 minutes and can only be used once.
      </p>
      <p>
        Didn&apos;t receive it?{" "}
        <a href="/sign-in">Request another</a>.
      </p>
    </main>
  );
}
