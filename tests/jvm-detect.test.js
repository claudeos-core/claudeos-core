/**
 * v2.5.x — jvm-detect unit tests (pure functions, no filesystem).
 *
 * Covers what the integration matrix cannot isolate: exact group-id
 * boundaries, variable resolution, block-boundary containment, and the
 * jar-name classifier.
 */
const { test } = require("node:test");
const assert = require("node:assert");
const J = require("../plan-installer/jvm-detect");

test("jvm-detect", async (t) => {
  await t.test("gradleJvmPlugins: apply-plugin, plugins DSL, Kotlin DSL bare identifiers", () => {
    assert.ok(J.gradleJvmPlugins(`apply plugin: 'java'`).has("java"));
    assert.ok(J.gradleJvmPlugins(`apply plugin: 'war'`).has("war"));
    assert.ok(J.gradleJvmPlugins(`plugins { id 'java-library' }`).has("java-library"));
    assert.ok(J.gradleJvmPlugins(`plugins { id("application") }`).has("application"));
    assert.ok(J.gradleJvmPlugins(`plugins {\n  java\n  war\n}`).has("war"));
    assert.ok(J.gradleJvmPlugins("plugins { `java-library` }").has("java-library"));
    // Android's plugin id contains the word but is not the JVM plugin.
    assert.ok(!J.gradleJvmPlugins(`plugins { id 'com.android.application' }`).has("application"));
    assert.ok(!J.gradleIsJvm(J.gradleJvmPlugins(`plugins { id 'com.android.application' }`)));
  });

  await t.test("gradlePackaging: ear > war > null, never an invented jar", () => {
    assert.equal(J.gradlePackaging(new Set(["java", "war"])), "war");
    assert.equal(J.gradlePackaging(new Set(["war", "ear"])), "ear");
    assert.equal(J.gradlePackaging(new Set(["java"])), null);
  });

  await t.test("gradleHasSpringFramework: group must be EXACTLY org.springframework", () => {
    assert.ok(J.gradleHasSpringFramework(`compile 'org.springframework:spring-webmvc:4.3.30.RELEASE'`));
    assert.ok(J.gradleHasSpringFramework(`compile 'org.springframework:spring:2.5.6'`));
    assert.ok(J.gradleHasSpringFramework(`compile group: 'org.springframework', name: 'spring-context', version: '5.3.30'`));
    assert.ok(J.gradleHasSpringFramework(`mavenBom 'org.springframework:spring-framework-bom:5.3.30'`));
    assert.ok(!J.gradleHasSpringFramework(`implementation 'org.springframework.boot:spring-boot-starter-web'`));
    assert.ok(!J.gradleHasSpringFramework(`implementation 'org.springframework.security:spring-security-core:5.8.0'`));
    assert.ok(!J.gradleHasSpringFramework(`implementation 'org.springframework.data:spring-data-jpa:3.2.0'`));
    assert.ok(!J.gradleHasSpringFramework(`implementation 'org.springframework.cloud:spring-cloud-starter:4.1.0'`));
  });

  await t.test("gradleSpringFrameworkVersion: bom > coord > group/name; ${var} resolved in-file", () => {
    assert.equal(J.gradleSpringFrameworkVersion(`compile 'org.springframework:spring-webmvc:4.3.30.RELEASE'`), "4.3.30.RELEASE");
    assert.equal(J.gradleSpringFrameworkVersion(`compile group: 'org.springframework', name: 'spring-webmvc', version: '3.2.18.RELEASE'`), "3.2.18.RELEASE");
    assert.equal(J.gradleSpringFrameworkVersion(`mavenBom 'org.springframework:spring-framework-bom:5.3.30'\nimplementation 'org.springframework:spring-webmvc'`), "5.3.30");
    assert.equal(J.gradleSpringFrameworkVersion(`ext { springVersion = '4.3.30.RELEASE' }\ncompile "org.springframework:spring-webmvc:\${springVersion}"`), "4.3.30.RELEASE");
    assert.equal(J.gradleSpringFrameworkVersion(`val springVersion = "6.1.3"\nimplementation("org.springframework:spring-context:\${springVersion}")`), "6.1.3");
    // Undefined variable → null. The `${springVersion}` text is never returned.
    assert.equal(J.gradleSpringFrameworkVersion(`compile "org.springframework:spring-webmvc:\${springVersion}"`), null);
    // A security/data version must not be mistaken for the Framework version.
    assert.equal(J.gradleSpringFrameworkVersion(`implementation 'org.springframework.security:spring-security-core:6.2.0'`), null);
  });

  await t.test("gradleSpringBootVersion: plugins DSL, buildscript classpath (Boot 1.x/2.x), dependencies BOM", () => {
    assert.equal(J.gradleSpringBootVersion(`id 'org.springframework.boot' version '2.7.18'`), "2.7.18");
    assert.equal(J.gradleSpringBootVersion(`id("org.springframework.boot") version "3.2.0"`), "3.2.0");
    assert.equal(J.gradleSpringBootVersion(`classpath("org.springframework.boot:spring-boot-gradle-plugin:1.5.22.RELEASE")`), "1.5.22.RELEASE");
    assert.equal(J.gradleSpringBootVersion(`ext { springBootVersion = '2.1.18.RELEASE' }\nclasspath("org.springframework.boot:spring-boot-gradle-plugin:\${springBootVersion}")`), "2.1.18.RELEASE");
    assert.equal(J.gradleSpringBootVersion(`mavenBom 'org.springframework.boot:spring-boot-dependencies:3.1.5'`), "3.1.5");
  });

  await t.test("catalogSpringFrameworkVersion: module + version.ref, inline version", () => {
    const toml = `[versions]\nspring = "5.3.31"\n[libraries]\nspring-webmvc = { module = "org.springframework:spring-webmvc", version.ref = "spring" }`;
    assert.equal(J.catalogSpringFrameworkVersion(toml), "5.3.31");
    assert.ok(J.catalogHasSpringFramework(toml));
    assert.equal(J.catalogSpringFrameworkVersion(`[libraries]\nctx = { module = "org.springframework:spring-context", version = "6.0.0" }`), "6.0.0");
    assert.equal(J.catalogSpringFrameworkVersion(`[libraries]\nsec = { module = "org.springframework.security:spring-security-core", version = "6.2.0" }`), null);
    assert.equal(J.catalogSpringFrameworkVersion(null), null);
  });

  await t.test("mavenPackaging reads only declared packaging", () => {
    assert.equal(J.mavenPackaging(`<project><packaging>war</packaging></project>`), "war");
    assert.equal(J.mavenPackaging(`<project><packaging> ear </packaging></project>`), "ear");
    assert.equal(J.mavenPackaging(`<project></project>`), null);
  });

  await t.test("mavenSpringFrameworkDeps: exact groupId, artifact whitelist, versionless entries kept", () => {
    const pom = `<dependencies>
      <dependency><groupId>org.springframework</groupId><artifactId>spring-webmvc</artifactId><version>4.3.30.RELEASE</version></dependency>
      <dependency><groupId>org.springframework</groupId><artifactId>spring-context</artifactId></dependency>
      <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-web</artifactId><version>2.7.18</version></dependency>
      <dependency><groupId>org.springframework.security</groupId><artifactId>spring-security-core</artifactId><version>5.8.0</version></dependency>
    </dependencies>`;
    const deps = J.mavenSpringFrameworkDeps(pom);
    assert.deepStrictEqual(deps.map(d => d.artifactId), ["spring-webmvc", "spring-context"]);
    assert.equal(J.mavenSpringFrameworkVersion(pom, pom), "4.3.30.RELEASE");
    // The group must match EXACTLY. A sub-group carrying a whitelisted
    // artifact name is the one input the artifact whitelist cannot catch —
    // only the `</groupId>` anchor does.
    const subGroup = `<dependency><groupId>org.springframework.fake</groupId><artifactId>spring-core</artifactId><version>9.9.9</version></dependency>`;
    assert.deepStrictEqual(J.mavenSpringFrameworkDeps(subGroup), []);
    assert.equal(J.mavenSpringFrameworkVersion(subGroup, subGroup), null);
  });

  await t.test("mavenSpringFrameworkVersion: bom first, then ${prop} resolution, then conventional property", () => {
    const bom = `<dependencyManagement><dependencies><dependency><groupId>org.springframework</groupId><artifactId>spring-framework-bom</artifactId><version>5.3.30</version><type>pom</type></dependency></dependencies></dependencyManagement>
<dependencies><dependency><groupId>org.springframework</groupId><artifactId>spring-webmvc</artifactId></dependency></dependencies>`;
    assert.equal(J.mavenSpringFrameworkVersion(bom, bom), "5.3.30");
    const prop = `<properties><spring.version>3.2.18.RELEASE</spring.version></properties>
<dependencies><dependency><groupId>org.springframework</groupId><artifactId>spring-webmvc</artifactId><version>\${spring.version}</version></dependency></dependencies>`;
    assert.equal(J.mavenSpringFrameworkVersion(prop, prop), "3.2.18.RELEASE");
    const undef = `<dependencies><dependency><groupId>org.springframework</groupId><artifactId>spring-webmvc</artifactId><version>\${spring.version}</version></dependency></dependencies>`;
    assert.equal(J.mavenSpringFrameworkVersion(undef, undef), null);
  });

  await t.test("mavenSpringBootVersion: starter-parent bounded to <parent>, BOM import, property", () => {
    const parent = `<parent><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-parent</artifactId><version>3.2.0</version></parent>`;
    assert.equal(J.mavenSpringBootVersion(parent, parent), "3.2.0");
    // Corporate parent; starter-parent string only inside a later dependency → null.
    const corp = `<parent><groupId>com.acme</groupId><artifactId>acme-parent</artifactId><version>9.9.9</version></parent>
<dependencies><dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-parent</artifactId><version>2.0.0</version></dependency></dependencies>`;
    assert.equal(J.mavenSpringBootVersion(corp, corp), null);
    const bom = `<dependencyManagement><dependencies><dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-dependencies</artifactId><version>2.7.18</version></dependency></dependencies></dependencyManagement>`;
    assert.equal(J.mavenSpringBootVersion(bom, bom), "2.7.18");
    assert.equal(J.mavenSpringBootVersion(`<properties><spring-boot.version>3.1.0</spring-boot.version></properties>`, ""), "3.1.0");
  });

  await t.test("mavenCompilerPluginSource: bounded to its own <plugin> block", () => {
    assert.equal(J.mavenCompilerPluginSource(`<plugin><artifactId>maven-compiler-plugin</artifactId><configuration><source>1.5</source><target>1.5</target></configuration></plugin>`), "1.5");
    // Compiler plugin without configuration must not borrow the next plugin's <source>.
    assert.equal(J.mavenCompilerPluginSource(`<plugin><artifactId>maven-compiler-plugin</artifactId></plugin><plugin><artifactId>maven-war-plugin</artifactId><configuration><source>9.9</source></configuration></plugin>`), null);
    // And when another plugin with a <source> comes FIRST, the compiler
    // plugin's own value must still win — an unbounded scan returns 9.9 here.
    assert.equal(J.mavenCompilerPluginSource(`<plugin><artifactId>maven-war-plugin</artifactId><configuration><source>9.9</source></configuration></plugin><plugin><artifactId>maven-compiler-plugin</artifactId><configuration><source>1.5</source></configuration></plugin>`), "1.5");
  });

  await t.test("antJavacSource / eclipseJreLevel / eclipseHasJavaNature", () => {
    assert.equal(J.antJavacSource(`<javac srcdir="src" destdir="build" source="1.6" target="1.6"/>`), "1.6");
    assert.equal(J.antJavacSource(`<javac srcdir="src"/>`), null);
    assert.equal(J.eclipseJreLevel(`<classpathentry kind="con" path="org.eclipse.jdt.launching.JRE_CONTAINER/.../JavaSE-1.7"/>`), "1.7");
    assert.equal(J.eclipseJreLevel(`<classpathentry kind="con" path=".../JavaSE-17"/>`), "17");
    assert.equal(J.eclipseJreLevel(`<classpathentry kind="con" path=".../J2SE-1.5"/>`), "1.5");
    assert.ok(J.eclipseHasJavaNature(`<nature>org.eclipse.jdt.core.javanature</nature>`));
    assert.ok(!J.eclipseHasJavaNature(`<nature>org.eclipse.wst.jsdt.core.jsNature</nature>`));
    assert.ok(!J.eclipseHasJavaNature(null));
  });

  await t.test("classifyJars: Spring jars by NAME, unversioned spring.jar reports framework with null version", () => {
    const r = J.classifyJars(["spring-webmvc-3.0.5.RELEASE.jar", "spring-core-3.0.5.RELEASE.jar", "servlet-api-2.5.jar"]);
    assert.equal(r.springFramework, true);
    assert.equal(r.springFrameworkVersion, "3.0.5.RELEASE");
    assert.equal(r.springBoot, false);
    const old = J.classifyJars(["spring.jar", "spring-webmvc.jar"]);
    assert.equal(old.springFramework, true);
    assert.equal(old.springFrameworkVersion, null);
    const boot = J.classifyJars(["spring-boot-2.7.18.jar", "spring-core-5.3.31.jar"]);
    assert.equal(boot.springBoot, true);
    assert.equal(boot.springBootVersion, "2.7.18");
    assert.equal(boot.springFrameworkVersion, "5.3.31");
    // security / data / ldap jars are not the Framework.
    const other = J.classifyJars(["spring-security-web-5.8.0.jar", "spring-data-jpa-2.7.0.jar", "spring-ldap-core-2.4.1.jar"]);
    assert.equal(other.springFramework, false);
  });

  await t.test("classifyJars: JDBC drivers and ORM jars, incl. Korean-market drivers", () => {
    const r = J.classifyJars(["ojdbc6.jar", "ibatis-sqlmap-2.3.4.726.jar", "tibero6-jdbc.jar", "mysql-connector-java-5.1.49.jar"]);
    assert.deepStrictEqual(r.databases, ["oracle", "tibero", "mysql"]);
    assert.equal(r.orm, "ibatis");
    const m = J.classifyJars(["mybatis-3.5.13.jar", "hibernate-core-5.6.15.Final.jar", "altibase.jar", "cubrid-jdbc-11.2.jar"]);
    assert.equal(m.orm, "mybatis");
    assert.deepStrictEqual(m.databases, ["altibase", "cubrid"]);
  });
});

test("jvm-detect — v2.5.1 additions", async (t) => {
  await t.test("gradleJvmPlugins: Kotlin DSL apply(plugin = \"war\")", () => {
    const p = J.gradleJvmPlugins(`apply(plugin = "java")\napply(plugin = "war")`);
    assert.ok(p.has("java") && p.has("war"));
  });

  await t.test("parseGradleProperties + resolveGradleVar second source", () => {
    const props = J.parseGradleProperties(`# comment\nspringVersion=4.3.30.RELEASE\norg.gradle.jvmargs=-Xmx2g\nbad line\nspringBootVersion: 2.1.18.RELEASE`);
    assert.deepStrictEqual(props, { springVersion: "4.3.30.RELEASE", "org.gradle.jvmargs": "-Xmx2g", springBootVersion: "2.1.18.RELEASE" });
    const g = `compile "org.springframework:spring-webmvc:\${springVersion}"`;
    assert.equal(J.gradleSpringFrameworkVersion(g), null);           // in-file only → unresolved
    assert.equal(J.gradleSpringFrameworkVersion(g, props), "4.3.30.RELEASE");
    // In-file definition beats gradle.properties.
    assert.equal(J.gradleSpringFrameworkVersion(`ext { springVersion = '5.0.0' }\n` + g, props), "5.0.0");
    // A non-version property value is never returned as a version.
    assert.equal(J.gradleSpringFrameworkVersion(g, { springVersion: "latest" }), null);
  });

  await t.test("ivy.xml: org exactly org.springframework, whitelisted name, rev", () => {
    const ivy = `<ivy-module><dependencies>
      <dependency org="org.springframework.security" name="spring-security-core" rev="3.2.0.RELEASE"/>
      <dependency org="org.springframework" name="spring-webmvc" rev="3.2.18.RELEASE"/>
    </dependencies></ivy-module>`;
    assert.ok(J.ivyHasSpringFramework(ivy));
    assert.equal(J.ivySpringFrameworkVersion(ivy), "3.2.18.RELEASE");
    assert.ok(!J.ivyHasSpringFramework(`<dependency org="org.springframework.security" name="spring-security-core" rev="3.2.0.RELEASE"/>`));
    // Sub-org carrying a whitelisted name: only the exact-org check rejects it.
    const subOrg = `<dependency org="org.springframework.fake" name="spring-core" rev="9.9.9"/>`;
    assert.ok(!J.ivyHasSpringFramework(subOrg));
    assert.equal(J.ivySpringFrameworkVersion(subOrg), null);
    assert.equal(J.ivySpringFrameworkVersion(null), null);
  });

  await t.test("eGovFrame: version from dependency (${prop} resolved), property fallback, Gradle coord", () => {
    const pom = `<properties><egovframework.rte.version>3.8.0</egovframework.rte.version></properties>
<dependencies><dependency><groupId>egovframework.rte</groupId><artifactId>egovframework.rte.ptl.mvc</artifactId><version>\${egovframework.rte.version}</version></dependency></dependencies>`;
    assert.ok(J.hasEgovframe(pom));
    assert.equal(J.egovframeVersion(pom, pom), "3.8.0");
    assert.equal(J.egovframeVersion(`<dependency><groupId>egovframework.rte</groupId><artifactId>x</artifactId><version>2.0.0</version></dependency>`), "2.0.0");
    assert.equal(J.egovframeVersion(`implementation 'egovframework.rte:egovframework.rte.ptl.mvc:4.1.0'`), "4.1.0");
    assert.ok(!J.hasEgovframe(`<groupId>org.springframework</groupId>`));
  });
});

test("jvm-detect — v2.5.1 round 2 (long-tail evidence)", async (t) => {
  await t.test("Spring 1.x bare `springframework` group, Maven / Gradle / Ivy", () => {
    assert.equal(J.mavenSpringFrameworkDeps(`<dependency><groupId>springframework</groupId><artifactId>spring</artifactId><version>1.2.9</version></dependency>`)[0].version, "1.2.9");
    assert.ok(J.gradleHasSpringFramework(`compile 'springframework:spring:1.2.9'`));
    assert.equal(J.gradleSpringFrameworkVersion(`compile 'springframework:spring:1.2.9'`), "1.2.9");
    assert.equal(J.ivySpringFrameworkVersion(`<dependency org="springframework" name="spring" rev="1.2.9"/>`), "1.2.9");
    // Still exact: `myspringframework` / `springframework.fake` are not it.
    assert.ok(!J.gradleHasSpringFramework(`compile 'myspringframework:spring:1.2.9'`));
    assert.deepStrictEqual(J.mavenSpringFrameworkDeps(`<dependency><groupId>springframework.fake</groupId><artifactId>spring</artifactId><version>1</version></dependency>`), []);
  });

  await t.test("gradleMapDeps: any key order, multi-line, security group rejected", () => {
    const d = J.gradleMapDeps(`compile name: 'spring-webmvc',\n  group: 'org.springframework',\n  version: '4.3.30.RELEASE'`)[0];
    assert.equal(d.isSpringFw, true); assert.equal(d.version, "4.3.30.RELEASE");
    assert.equal(J.gradleMapDeps(`compile group: 'org.springframework.security', name: 'spring-security-core', version: '5.8.0'`)[0].isSpringFw, false);
  });

  await t.test("resolveGradleVar: project./rootProject.ext. prefixes, Groovy map, Kotlin object", () => {
    assert.equal(J.resolveGradleVar(`ext { springVersion = '4.3.30.RELEASE' }`, "project.springVersion"), "4.3.30.RELEASE");
    assert.equal(J.resolveGradleVar(`ext { springVersion = '4.3.30.RELEASE' }`, "rootProject.ext.springVersion"), "4.3.30.RELEASE");
    assert.equal(J.resolveGradleVar(`ext { versions = [\n spring : '4.3.30.RELEASE',\n junit: '4.12'\n] }`, "versions.spring"), "4.3.30.RELEASE");
    assert.equal(J.resolveGradleVar(`object Versions {\n    const val spring = "5.3.30"\n}`, "Versions.spring"), "5.3.30");
    assert.equal(J.resolveGradleVar(`versions.spring = '5.0.0'`, "versions.spring"), "5.0.0");
    assert.equal(J.resolveGradleVar(`ext { versions = [ junit: '4.12' ] }`, "versions.spring"), null);
  });

  await t.test("gradleAppliedScripts", () => {
    assert.deepStrictEqual(J.gradleAppliedScripts(`apply from: 'gradle/dependencies.gradle'\napply(from = "gradle/versions.gradle.kts")\napply from: rootProject.file('deps.gradle')`), ["gradle/dependencies.gradle", "gradle/versions.gradle.kts", "deps.gradle"]);
  });

  await t.test("Eclipse: jdt prefs level, custom JRE names, .classpath jar refs", () => {
    assert.equal(J.eclipseJdtPrefsLevel(`org.eclipse.jdt.core.compiler.compliance=1.6\norg.eclipse.jdt.core.compiler.source=1.6`), "1.6");
    assert.equal(J.eclipseJdtPrefsLevel(null), null);
    assert.equal(J.eclipseJreLevel(`path=".../StandardVMType/jdk1.6.0_45"`), "1.6");
    assert.equal(J.eclipseJreLevel(`path=".../StandardVMType/jdk-17.0.2"`), "17");
    assert.deepStrictEqual(J.eclipseClasspathJars(`<classpathentry kind="lib" path="WebContent/WEB-INF/lib/spring-webmvc-3.0.5.RELEASE.jar"/><classpathentry kind="var" path="M2_REPO/com/oracle/ojdbc6/11.2/ojdbc6-11.2.jar"/><classpathentry kind="src" path="src"/>`),
      ["WebContent/WEB-INF/lib/spring-webmvc-3.0.5.RELEASE.jar", "M2_REPO/com/oracle/ojdbc6/11.2/ojdbc6-11.2.jar"]);
  });

  await t.test("IntelliJ / NetBeans", () => {
    assert.equal(J.intellijLanguageLevel(`languageLevel="JDK_1_7"`), "1.7");
    assert.equal(J.intellijLanguageLevel(`languageLevel="JDK_17"`), "17");
    assert.equal(J.intellijLanguageLevel(`<project/>`), null);
    const nb = J.netbeansProject(`javac.source=1.6\nfile.reference.spring-webmvc-3.0.5.RELEASE.jar=lib/x.jar\nfile.reference.ojdbc6.jar=lib/ojdbc6.jar`);
    assert.equal(nb.level, "1.6"); assert.deepStrictEqual(nb.jars, ["spring-webmvc-3.0.5.RELEASE.jar", "ojdbc6.jar"]);
  });

  await t.test("web.xml facts, Spring XSD version (highest wins), Struts/JSF tags", () => {
    const wx = J.webXmlFacts(`<web-app version="2.5"><servlet-class>org.springframework.web.servlet.DispatcherServlet</servlet-class><filter-class>org.apache.struts2.dispatcher.filter.StrutsPrepareAndExecuteFilter</filter-class></web-app>`);
    assert.deepStrictEqual(wx, { spring: true, struts: "struts2", servletVersion: "2.5" });
    assert.equal(J.webXmlFacts(`<web-app><servlet-class>org.apache.struts.action.ActionServlet</servlet-class></web-app>`).struts, "struts");
    assert.equal(J.springXsdVersion(`http://www.springframework.org/schema/beans/spring-beans-2.5.xsd http://www.springframework.org/schema/context/spring-context-3.0.xsd`), "3.0");
    assert.equal(J.springXsdVersion(`<beans/>`), null);
    assert.deepStrictEqual(J.legacyFrameworkTags(`<dependency><groupId>struts</groupId><artifactId>struts</artifactId><version>1.2.9</version></dependency>`), [{ tag: "struts", version: "1.2.9" }]);
    assert.deepStrictEqual(J.legacyFrameworkTags(`compile 'org.apache.struts:struts2-core:2.5.33'`), [{ tag: "struts2", version: "2.5.33" }]);
    assert.deepStrictEqual(J.legacyFrameworkTags(`<dependency><groupId>javax.faces</groupId><artifactId>javax.faces-api</artifactId><version>2.2</version></dependency>`), [{ tag: "jsf", version: "2.2" }]);
  });
});
