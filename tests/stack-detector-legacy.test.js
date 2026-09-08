/**
 * v2.5.1 — Legacy JVM detection matrix (integration).
 *
 * Every case is a real build-file shape seen in enterprise/SI codebases:
 * Gradle apply-plugin era, Maven 2 poms, Maven multi-module, gradle.properties
 * indirection, Gradle + fileTree(lib) jars, Ant + WEB-INF/lib, Ant + Ivy,
 * Eclipse WTP (.classpath/.settings), IntelliJ, NetBeans, WEB-INF/web.xml, Spring
 * XSD hints, Spring 1.x `springframework` group, eGovFrame, EUC-KR encoded poms.
 * Y-cases guard the new evidence sources against Node/Python/Kotlin projects.
 * Expectations are what the fixture DECLARES — every expected version string
 * appears verbatim in the fixture text or jar name. No version is invented.
 * X-cases are false-positive guards: spring-security / spring-data / Android
 * / Kotlin must never be reported as Spring Framework or Java.
 */
const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { detectStack } = require("../plan-installer/stack-detector");

const CASES = {
  "G01 java plugin + spring-webmvc coord": {
    "files": {
      "build.gradle": "apply plugin: 'java'\napply plugin: 'eclipse'\nsourceCompatibility = 1.7\nrepositories { mavenCentral() }\ndependencies {\n  compile 'org.springframework:spring-webmvc:4.3.30.RELEASE'\n  compile 'javax.servlet:javax.servlet-api:3.1.0'\n}"
    },
    "expect": {
      "language": "java",
      "languageVersion": "7",
      "framework": "spring-framework",
      "frameworkVersion": "4.3.30.RELEASE",
      "packaging": null
    }
  },
  "G02 war plugin only + group/name/version notation": {
    "files": {
      "build.gradle": "apply plugin: 'war'\nsourceCompatibility = 1.6\ndependencies {\n  compile group: 'org.springframework', name: 'spring-webmvc', version: '3.2.18.RELEASE'\n  providedCompile group: 'javax.servlet', name: 'servlet-api', version: '2.5'\n}"
    },
    "expect": {
      "language": "java",
      "languageVersion": "6",
      "framework": "spring-framework",
      "frameworkVersion": "3.2.18.RELEASE",
      "packaging": "war"
    }
  },
  "G03 Spring 2.x single jar (org.springframework:spring)": {
    "files": {
      "build.gradle": "apply plugin: 'java'\napply plugin: 'war'\nsourceCompatibility = 1.5\ndependencies {\n  compile 'org.springframework:spring:2.5.6'\n  compile 'org.springframework:spring-webmvc:2.5.6'\n}"
    },
    "expect": {
      "language": "java",
      "languageVersion": "5",
      "framework": "spring-framework",
      "frameworkVersion": "2.5.6",
      "packaging": "war"
    }
  },
  "G04 plugins DSL + spring-context (non-web)": {
    "files": {
      "build.gradle": "plugins {\n  id 'java'\n}\njava { sourceCompatibility = JavaVersion.VERSION_11 }\ndependencies {\n  implementation 'org.springframework:spring-context:5.3.30'\n  implementation 'org.springframework:spring-jdbc:5.3.30'\n}"
    },
    "expect": {
      "language": "java",
      "languageVersion": "11",
      "framework": "spring-framework",
      "frameworkVersion": "5.3.30",
      "packaging": null
    }
  },
  "G05 spring-boot plugins DSL (regression guard)": {
    "files": {
      "build.gradle": "plugins {\n  id 'java'\n  id 'org.springframework.boot' version '2.7.18'\n}\nsourceCompatibility = '1.8'\ndependencies { implementation 'org.springframework.boot:spring-boot-starter-web' }"
    },
    "expect": {
      "language": "java",
      "languageVersion": "8",
      "framework": "spring-boot",
      "frameworkVersion": "2.7.18",
      "packaging": null
    }
  },
  "G06 pure java-library, NO spring (false-positive guard)": {
    "files": {
      "build.gradle": "plugins { id 'java-library' }\njava { toolchain { languageVersion = JavaLanguageVersion.of(17) } }\ndependencies {\n  api 'com.google.guava:guava:32.1.3-jre'\n  implementation 'org.apache.commons:commons-lang3:3.14.0'\n}"
    },
    "expect": {
      "language": "java",
      "languageVersion": "17",
      "framework": null,
      "frameworkVersion": null,
      "packaging": null
    }
  },
  "G07 application plugin, NO spring (false-positive guard)": {
    "files": {
      "build.gradle": "plugins { id 'application' }\napplication { mainClass = 'com.acme.Main' }\nsourceCompatibility = 11\ndependencies { implementation 'com.fasterxml.jackson.core:jackson-databind:2.15.3' }"
    },
    "expect": {
      "language": "java",
      "languageVersion": "11",
      "framework": null,
      "frameworkVersion": null,
      "packaging": null
    }
  },
  "G08 war plugin + servlet only, NO spring (false-positive guard)": {
    "files": {
      "build.gradle": "apply plugin: 'war'\nsourceCompatibility = 1.7\ndependencies {\n  providedCompile 'javax.servlet:javax.servlet-api:3.0.1'\n  compile 'javax.servlet:jstl:1.2'\n  compile 'org.apache.struts:struts2-core:2.5.33'\n}"
    },
    "expect": {
      "language": "java",
      "languageVersion": "7",
      "framework": null,
      "frameworkVersion": null,
      "packaging": "war"
    }
  },
  "G09 ext variable spring version": {
    "files": {
      "build.gradle": "apply plugin: 'java'\next {\n  springVersion = '4.3.30.RELEASE'\n  javaVersion = '1.8'\n}\nsourceCompatibility = \"${javaVersion}\"\ndependencies {\n  compile \"org.springframework:spring-webmvc:${springVersion}\"\n  compile \"org.springframework:spring-orm:${springVersion}\"\n}"
    },
    "expect": {
      "language": "java",
      "languageVersion": "8",
      "framework": "spring-framework",
      "frameworkVersion": "4.3.30.RELEASE",
      "packaging": null
    }
  },
  "G10 spring-framework-bom via dependencyManagement (no version on deps)": {
    "files": {
      "build.gradle": "plugins {\n  id 'java'\n  id 'io.spring.dependency-management' version '1.1.4'\n}\ndependencyManagement {\n  imports { mavenBom 'org.springframework:spring-framework-bom:5.3.30' }\n}\ndependencies {\n  implementation 'org.springframework:spring-webmvc'\n  implementation 'org.springframework:spring-jdbc'\n}"
    },
    "expect": {
      "language": "java",
      "framework": "spring-framework",
      "frameworkVersion": "5.3.30",
      "packaging": null
    }
  },
  "G11 Boot 1.x buildscript classpath + apply plugin 'spring-boot'": {
    "files": {
      "build.gradle": "buildscript {\n  repositories { mavenCentral() }\n  dependencies { classpath(\"org.springframework.boot:spring-boot-gradle-plugin:1.5.22.RELEASE\") }\n}\napply plugin: 'java'\napply plugin: 'spring-boot'\nsourceCompatibility = 1.8\ndependencies { compile('org.springframework.boot:spring-boot-starter-web') }"
    },
    "expect": {
      "language": "java",
      "languageVersion": "8",
      "framework": "spring-boot",
      "frameworkVersion": "1.5.22.RELEASE",
      "packaging": null
    }
  },
  "G12 Boot 2.x buildscript classpath + apply plugin 'org.springframework.boot'": {
    "files": {
      "build.gradle": "buildscript {\n  ext { springBootVersion = '2.1.18.RELEASE' }\n  dependencies { classpath(\"org.springframework.boot:spring-boot-gradle-plugin:${springBootVersion}\") }\n}\napply plugin: 'java'\napply plugin: 'org.springframework.boot'\napply plugin: 'io.spring.dependency-management'\nsourceCompatibility = 1.8"
    },
    "expect": {
      "language": "java",
      "languageVersion": "8",
      "framework": "spring-boot",
      "frameworkVersion": "2.1.18.RELEASE",
      "packaging": null
    }
  },
  "G13 Kotlin DSL java plugin + spring-webmvc": {
    "files": {
      "build.gradle.kts": "plugins {\n  java\n  war\n}\njava { sourceCompatibility = JavaVersion.VERSION_1_8 }\ndependencies {\n  implementation(\"org.springframework:spring-webmvc:5.2.25.RELEASE\")\n}",
      "src/main/java/com/acme/A.java": "package com.acme; class A {}"
    },
    "expect": {
      "language": "java",
      "languageVersion": "8",
      "framework": "spring-framework",
      "frameworkVersion": "5.2.25.RELEASE",
      "packaging": "war"
    }
  },
  "G14 Kotlin DSL java-library, NO spring (false-positive guard)": {
    "files": {
      "build.gradle.kts": "plugins { `java-library` }\njava { toolchain { languageVersion.set(JavaLanguageVersion.of(21)) } }\ndependencies { api(\"org.slf4j:slf4j-api:2.0.9\") }",
      "src/main/java/com/acme/A.java": "package com.acme; class A {}"
    },
    "expect": {
      "language": "java",
      "languageVersion": "21",
      "framework": null,
      "frameworkVersion": null,
      "packaging": null
    }
  },
  "G15 version catalog spring version": {
    "files": {
      "build.gradle": "plugins { id 'java' }\ndependencies { implementation libs.spring.webmvc }",
      "gradle/libs.versions.toml": "[versions]\nspring = \"5.3.31\"\n[libraries]\nspring-webmvc = { module = \"org.springframework:spring-webmvc\", version.ref = \"spring\" }"
    },
    "expect": {
      "language": "java",
      "framework": "spring-framework",
      "frameworkVersion": "5.3.31",
      "packaging": null
    }
  },
  "M01 spring-webmvc dep + war packaging": {
    "files": {
      "pom.xml": "<project xmlns=\"http://maven.apache.org/POM/4.0.0\">\n  <modelVersion>4.0.0</modelVersion>\n  <groupId>com.acme</groupId><artifactId>legacy</artifactId><version>1.0</version>\n  <packaging>war</packaging>\n  <properties><maven.compiler.source>1.7</maven.compiler.source><maven.compiler.target>1.7</maven.compiler.target></properties>\n<dependencies><dependency><groupId>org.springframework</groupId><artifactId>spring-webmvc</artifactId><version>4.3.30.RELEASE</version></dependency><dependency><groupId>javax.servlet</groupId><artifactId>javax.servlet-api</artifactId><version>3.1.0</version></dependency></dependencies>\n</project>"
    },
    "expect": {
      "language": "java",
      "languageVersion": "7",
      "framework": "spring-framework",
      "frameworkVersion": "4.3.30.RELEASE",
      "packaging": "war"
    }
  },
  "M02 spring.version property + ${spring.version} refs": {
    "files": {
      "pom.xml": "<project xmlns=\"http://maven.apache.org/POM/4.0.0\">\n  <modelVersion>4.0.0</modelVersion>\n  <groupId>com.acme</groupId><artifactId>legacy</artifactId><version>1.0</version>\n  <packaging>war</packaging>\n  <properties><spring.version>3.2.18.RELEASE</spring.version><java.version>1.6</java.version></properties>\n<dependencies><dependency><groupId>org.springframework</groupId><artifactId>spring-webmvc</artifactId><version>${spring.version}</version></dependency><dependency><groupId>org.springframework</groupId><artifactId>spring-orm</artifactId><version>${spring.version}</version></dependency></dependencies>\n</project>"
    },
    "expect": {
      "language": "java",
      "languageVersion": "6",
      "framework": "spring-framework",
      "frameworkVersion": "3.2.18.RELEASE",
      "packaging": "war"
    }
  },
  "M03 spring-framework-bom in dependencyManagement": {
    "files": {
      "pom.xml": "<project xmlns=\"http://maven.apache.org/POM/4.0.0\">\n  <modelVersion>4.0.0</modelVersion>\n  <groupId>com.acme</groupId><artifactId>legacy</artifactId><version>1.0</version>\n  <packaging>jar</packaging>\n  <dependencyManagement><dependencies><dependency><groupId>org.springframework</groupId><artifactId>spring-framework-bom</artifactId><version>5.3.30</version><type>pom</type><scope>import</scope></dependency></dependencies></dependencyManagement>\n<dependencies><dependency><groupId>org.springframework</groupId><artifactId>spring-context</artifactId></dependency><dependency><groupId>org.springframework</groupId><artifactId>spring-webmvc</artifactId></dependency></dependencies>\n</project>"
    },
    "expect": {
      "language": "java",
      "framework": "spring-framework",
      "frameworkVersion": "5.3.30",
      "packaging": "jar"
    }
  },
  "M04 Spring 2.x single jar": {
    "files": {
      "pom.xml": "<project xmlns=\"http://maven.apache.org/POM/4.0.0\">\n  <modelVersion>4.0.0</modelVersion>\n  <groupId>com.acme</groupId><artifactId>legacy</artifactId><version>1.0</version>\n  <packaging>war</packaging>\n  <dependencies><dependency><groupId>org.springframework</groupId><artifactId>spring</artifactId><version>2.5.6</version></dependency><dependency><groupId>org.springframework</groupId><artifactId>spring-webmvc</artifactId><version>2.5.6</version></dependency></dependencies>\n</project>"
    },
    "expect": {
      "language": "java",
      "framework": "spring-framework",
      "frameworkVersion": "2.5.6",
      "packaging": "war"
    }
  },
  "M05 pure java lib, NO spring (false-positive guard)": {
    "files": {
      "pom.xml": "<project xmlns=\"http://maven.apache.org/POM/4.0.0\">\n  <modelVersion>4.0.0</modelVersion>\n  <groupId>com.acme</groupId><artifactId>legacy</artifactId><version>1.0</version>\n  <packaging>jar</packaging>\n  <properties><java.version>11</java.version></properties>\n<dependencies><dependency><groupId>com.google.guava</groupId><artifactId>guava</artifactId><version>32.1.3-jre</version></dependency><dependency><groupId>org.apache.commons</groupId><artifactId>commons-lang3</artifactId><version>3.14.0</version></dependency></dependencies>\n</project>"
    },
    "expect": {
      "language": "java",
      "languageVersion": "11",
      "framework": null,
      "frameworkVersion": null,
      "packaging": "jar"
    }
  },
  "M06 spring-boot-starter-parent (regression guard)": {
    "files": {
      "pom.xml": "<project xmlns=\"http://maven.apache.org/POM/4.0.0\">\n  <modelVersion>4.0.0</modelVersion>\n  <groupId>com.acme</groupId><artifactId>legacy</artifactId><version>1.0</version>\n  \n  <parent><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-parent</artifactId><version>3.2.0</version></parent>\n<properties><java.version>17</java.version></properties>\n<dependencies><dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-web</artifactId></dependency></dependencies>\n</project>"
    },
    "expect": {
      "language": "java",
      "languageVersion": "17",
      "framework": "spring-boot",
      "frameworkVersion": "3.2.0",
      "packaging": null
    }
  },
  "M07 spring-boot-dependencies BOM import (no parent)": {
    "files": {
      "pom.xml": "<project xmlns=\"http://maven.apache.org/POM/4.0.0\">\n  <modelVersion>4.0.0</modelVersion>\n  <groupId>com.acme</groupId><artifactId>legacy</artifactId><version>1.0</version>\n  \n  <dependencyManagement><dependencies><dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-dependencies</artifactId><version>2.7.18</version><type>pom</type><scope>import</scope></dependency></dependencies></dependencyManagement>\n<dependencies><dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-web</artifactId></dependency></dependencies>\n</project>"
    },
    "expect": {
      "language": "java",
      "framework": "spring-boot",
      "frameworkVersion": "2.7.18",
      "packaging": null
    }
  },
  "M08 maven-compiler-plugin <source>1.5</source> (no properties)": {
    "files": {
      "pom.xml": "<project xmlns=\"http://maven.apache.org/POM/4.0.0\">\n  <modelVersion>4.0.0</modelVersion>\n  <groupId>com.acme</groupId><artifactId>legacy</artifactId><version>1.0</version>\n  <packaging>war</packaging>\n  <build><plugins><plugin><groupId>org.apache.maven.plugins</groupId><artifactId>maven-compiler-plugin</artifactId><version>2.3.2</version><configuration><source>1.5</source><target>1.5</target></configuration></plugin></plugins></build>\n<dependencies><dependency><groupId>org.springframework</groupId><artifactId>spring</artifactId><version>2.5.6</version></dependency></dependencies>\n</project>"
    },
    "expect": {
      "language": "java",
      "languageVersion": "5",
      "framework": "spring-framework",
      "frameworkVersion": "2.5.6",
      "packaging": "war"
    }
  },
  "M09 struts1 + servlet war, NO spring (false-positive guard)": {
    "files": {
      "pom.xml": "<project xmlns=\"http://maven.apache.org/POM/4.0.0\">\n  <modelVersion>4.0.0</modelVersion>\n  <groupId>com.acme</groupId><artifactId>legacy</artifactId><version>1.0</version>\n  <packaging>war</packaging>\n  <dependencies><dependency><groupId>struts</groupId><artifactId>struts</artifactId><version>1.2.9</version></dependency><dependency><groupId>javax.servlet</groupId><artifactId>servlet-api</artifactId><version>2.4</version></dependency></dependencies>\n</project>"
    },
    "expect": {
      "language": "java",
      "framework": null,
      "frameworkVersion": null,
      "packaging": "war"
    }
  },
  "M10 spring-core only (context absent) still spring-framework": {
    "files": {
      "pom.xml": "<project xmlns=\"http://maven.apache.org/POM/4.0.0\">\n  <modelVersion>4.0.0</modelVersion>\n  <groupId>com.acme</groupId><artifactId>legacy</artifactId><version>1.0</version>\n  <packaging>jar</packaging>\n  <dependencies><dependency><groupId>org.springframework</groupId><artifactId>spring-core</artifactId><version>4.1.9.RELEASE</version></dependency><dependency><groupId>org.springframework</groupId><artifactId>spring-beans</artifactId><version>4.1.9.RELEASE</version></dependency></dependencies>\n</project>"
    },
    "expect": {
      "language": "java",
      "framework": "spring-framework",
      "frameworkVersion": "4.1.9.RELEASE",
      "packaging": "jar"
    }
  },
  "M11 commented-out spring dep must NOT count": {
    "files": {
      "pom.xml": "<project xmlns=\"http://maven.apache.org/POM/4.0.0\">\n  <modelVersion>4.0.0</modelVersion>\n  <groupId>com.acme</groupId><artifactId>legacy</artifactId><version>1.0</version>\n  <packaging>war</packaging>\n  <dependencies><!-- <dependency><groupId>org.springframework</groupId><artifactId>spring-webmvc</artifactId><version>4.3.30.RELEASE</version></dependency> --><dependency><groupId>javax.servlet</groupId><artifactId>servlet-api</artifactId><version>2.5</version></dependency></dependencies>\n</project>"
    },
    "expect": {
      "language": "java",
      "framework": null,
      "frameworkVersion": null,
      "packaging": "war"
    }
  },
  "M12 ear packaging": {
    "files": {
      "pom.xml": "<project xmlns=\"http://maven.apache.org/POM/4.0.0\">\n  <modelVersion>4.0.0</modelVersion>\n  <groupId>com.acme</groupId><artifactId>legacy</artifactId><version>1.0</version>\n  <packaging>ear</packaging>\n  <dependencies><dependency><groupId>org.springframework</groupId><artifactId>spring-context</artifactId><version>4.0.9.RELEASE</version></dependency></dependencies>\n</project>"
    },
    "expect": {
      "language": "java",
      "framework": "spring-framework",
      "frameworkVersion": "4.0.9.RELEASE",
      "packaging": "ear"
    }
  },
  "A01 Ant build.xml + WEB-INF/lib spring jars": {
    "files": {
      "build.xml": "<project name=\"legacy\" default=\"war\"><property name=\"src\" value=\"src\"/><target name=\"compile\"><javac srcdir=\"src\" destdir=\"build\" source=\"1.6\" target=\"1.6\"/></target></project>",
      "WebContent/WEB-INF/lib/spring-webmvc-3.0.5.RELEASE.jar": "",
      "WebContent/WEB-INF/lib/spring-core-3.0.5.RELEASE.jar": "",
      "WebContent/WEB-INF/lib/servlet-api-2.5.jar": "",
      "src/com/acme/A.java": "package com.acme; class A {}"
    },
    "expect": {
      "language": "java",
      "languageVersion": "6",
      "framework": "spring-framework",
      "frameworkVersion": "3.0.5.RELEASE",
      "buildTool": "ant",
      "packaging": "war"
    }
  },
  "A02 Ant + Spring 2.0 single jar (spring.jar, no version in name)": {
    "files": {
      "build.xml": "<project name=\"legacy\"><target name=\"compile\"><javac srcdir=\"src\" source=\"1.5\" target=\"1.5\"/></target></project>",
      "WebContent/WEB-INF/lib/spring.jar": "",
      "WebContent/WEB-INF/lib/spring-webmvc.jar": "",
      "src/com/acme/A.java": "package com.acme; class A {}"
    },
    "expect": {
      "language": "java",
      "languageVersion": "5",
      "framework": "spring-framework",
      "frameworkVersion": null,
      "buildTool": "ant",
      "packaging": "war"
    }
  },
  "A03 Ant, NO spring (false-positive guard)": {
    "files": {
      "build.xml": "<project name=\"tool\"><target name=\"compile\"><javac srcdir=\"src\" source=\"1.4\" target=\"1.4\"/></target></project>",
      "lib/commons-lang-2.6.jar": "",
      "src/com/acme/A.java": "package com.acme; class A {}"
    },
    "expect": {
      "language": "java",
      "languageVersion": "4",
      "framework": null,
      "frameworkVersion": null,
      "buildTool": "ant",
      "packaging": null
    }
  },
  "N01 no build file, Eclipse .classpath + WEB-INF/lib": {
    "files": {
      ".classpath": "<classpath><classpathentry kind=\"src\" path=\"src\"/><classpathentry kind=\"con\" path=\"org.eclipse.jdt.launching.JRE_CONTAINER/org.eclipse.jdt.internal.debug.ui.launcher.StandardVMType/JavaSE-1.7\"/></classpath>",
      ".project": "<projectDescription><name>legacy</name><natures><nature>org.eclipse.jdt.core.javanature</nature><nature>org.eclipse.wst.common.project.facet.core.nature</nature></natures></projectDescription>",
      "WebContent/WEB-INF/lib/spring-webmvc-4.0.9.RELEASE.jar": "",
      "src/com/acme/A.java": "package com.acme; class A {}"
    },
    "expect": {
      "language": "java",
      "languageVersion": "7",
      "framework": "spring-framework",
      "frameworkVersion": "4.0.9.RELEASE",
      "buildTool": null,
      "packaging": "war"
    }
  },
  "N02 no build file, bare src/**/*.java only": {
    "files": {
      "src/com/acme/A.java": "package com.acme; class A {}",
      "src/com/acme/B.java": "package com.acme; class B {}"
    },
    "expect": {
      "language": "java",
      "framework": null,
      "frameworkVersion": null,
      "buildTool": null,
      "packaging": null
    }
  },
  "R01 Maven multi-module: root pom packaging=pom, spring only in child": {
    "files": {
      "pom.xml": "<project xmlns=\"http://maven.apache.org/POM/4.0.0\"><modelVersion>4.0.0</modelVersion><groupId>a</groupId><artifactId>b</artifactId><version>1</version><packaging>pom</packaging><modules><module>core</module><module>web</module></modules><properties><java.version>1.7</java.version></properties></project>",
      "core/pom.xml": "<project xmlns=\"http://maven.apache.org/POM/4.0.0\"><modelVersion>4.0.0</modelVersion><groupId>a</groupId><artifactId>b</artifactId><version>1</version><packaging>jar</packaging><dependencies><dependency><groupId>com.google.guava</groupId><artifactId>guava</artifactId><version>20.0</version></dependency></dependencies></project>",
      "web/pom.xml": "<project xmlns=\"http://maven.apache.org/POM/4.0.0\"><modelVersion>4.0.0</modelVersion><groupId>a</groupId><artifactId>b</artifactId><version>1</version><packaging>war</packaging><dependencies><dependency><groupId>org.springframework</groupId><artifactId>spring-webmvc</artifactId><version>4.3.30.RELEASE</version></dependency></dependencies></project>"
    },
    "expect": {
      "language": "java",
      "languageVersion": "7",
      "framework": "spring-framework",
      "frameworkVersion": "4.3.30.RELEASE",
      "packaging": "pom"
    }
  },
  "R02 Maven multi-module: version in root <properties>, ${} in child": {
    "files": {
      "pom.xml": "<project xmlns=\"http://maven.apache.org/POM/4.0.0\"><modelVersion>4.0.0</modelVersion><groupId>a</groupId><artifactId>b</artifactId><version>1</version><packaging>pom</packaging><modules><module>web</module></modules><properties><spring.version>3.2.18.RELEASE</spring.version></properties></project>",
      "web/pom.xml": "<project xmlns=\"http://maven.apache.org/POM/4.0.0\"><modelVersion>4.0.0</modelVersion><groupId>a</groupId><artifactId>b</artifactId><version>1</version><packaging>war</packaging><dependencies><dependency><groupId>org.springframework</groupId><artifactId>spring-webmvc</artifactId><version>${spring.version}</version></dependency></dependencies></project>"
    },
    "expect": {
      "framework": "spring-framework",
      "frameworkVersion": "3.2.18.RELEASE"
    }
  },
  "R03 gradle.properties holds springVersion": {
    "files": {
      "build.gradle": "apply plugin: 'java'\ndependencies { compile \"org.springframework:spring-webmvc:${springVersion}\" }",
      "gradle.properties": "springVersion=4.3.30.RELEASE\norg.gradle.jvmargs=-Xmx2g"
    },
    "expect": {
      "framework": "spring-framework",
      "frameworkVersion": "4.3.30.RELEASE"
    }
  },
  "R04 Gradle + fileTree(lib) jars, no coords": {
    "files": {
      "build.gradle": "apply plugin: 'war'\nsourceCompatibility = 1.6\ndependencies { compile fileTree(dir: 'WebContent/WEB-INF/lib', include: '*.jar') }",
      "WebContent/WEB-INF/lib/spring-webmvc-3.1.4.RELEASE.jar": "",
      "WebContent/WEB-INF/lib/ojdbc6.jar": "",
      "WebContent/WEB-INF/lib/ibatis-sqlmap-2.3.4.jar": ""
    },
    "expect": {
      "language": "java",
      "languageVersion": "6",
      "framework": "spring-framework",
      "frameworkVersion": "3.1.4.RELEASE",
      "database": "oracle",
      "orm": "ibatis",
      "packaging": "war"
    }
  },
  "R05 eGovFrame 3.x pom": {
    "files": {
      "pom.xml": "<project xmlns=\"http://maven.apache.org/POM/4.0.0\"><modelVersion>4.0.0</modelVersion><groupId>a</groupId><artifactId>b</artifactId><version>1</version><packaging>war</packaging><properties><spring.maven.version>4.3.16.RELEASE</spring.maven.version><egovframework.rte.version>3.8.0</egovframework.rte.version></properties>\n<dependencies><dependency><groupId>egovframework.rte</groupId><artifactId>egovframework.rte.ptl.mvc</artifactId><version>${egovframework.rte.version}</version></dependency><dependency><groupId>org.springframework</groupId><artifactId>spring-webmvc</artifactId><version>${spring.maven.version}</version></dependency></dependencies></project>"
    },
    "expect": {
      "language": "java",
      "framework": "spring-framework",
      "frameworkVersion": "4.3.16.RELEASE",
      "packaging": "war"
    },
    "detectedHas": "egovframe 3.8.0"
  },
  "R06 eGovFrame 2.x pom (spring in bom-less dependencyManagement)": {
    "files": {
      "pom.xml": "<project xmlns=\"http://maven.apache.org/POM/4.0.0\"><modelVersion>4.0.0</modelVersion><groupId>a</groupId><artifactId>b</artifactId><version>1</version><packaging>war</packaging><properties><spring.maven.version>3.0.5.RELEASE</spring.maven.version></properties>\n<dependencies><dependency><groupId>egovframework.rte</groupId><artifactId>egovframework.rte.ptl.mvc</artifactId><version>2.0.0</version></dependency><dependency><groupId>org.springframework</groupId><artifactId>spring-context</artifactId><version>${spring.maven.version}</version></dependency></dependencies></project>"
    },
    "expect": {
      "framework": "spring-framework",
      "frameworkVersion": "3.0.5.RELEASE"
    },
    "detectedHas": "egovframe 2.0.0"
  },
  "R07 Ant + Ivy ivy.xml": {
    "files": {
      "build.xml": "<project name=\"x\"><target name=\"compile\"><javac srcdir=\"src\" source=\"1.6\"/></target></project>",
      "ivy.xml": "<ivy-module version=\"2.0\"><dependencies><dependency org=\"org.springframework\" name=\"spring-webmvc\" rev=\"3.2.18.RELEASE\"/><dependency org=\"org.apache.ibatis\" name=\"ibatis-sqlmap\" rev=\"2.3.4.726\"/></dependencies></ivy-module>",
      "src/A.java": ""
    },
    "expect": {
      "language": "java",
      "languageVersion": "6",
      "framework": "spring-framework",
      "frameworkVersion": "3.2.18.RELEASE",
      "buildTool": "ant",
      "orm": "ibatis"
    }
  },
  "R08 Kotlin DSL apply(plugin = \"war\")": {
    "files": {
      "build.gradle.kts": "apply(plugin = \"java\")\napply(plugin = \"war\")\ndependencies { implementation(\"org.springframework:spring-webmvc:5.3.30\") }",
      "src/main/java/A.java": ""
    },
    "expect": {
      "language": "java",
      "framework": "spring-framework",
      "frameworkVersion": "5.3.30",
      "packaging": "war"
    }
  },
  "R09 <maven.compiler.release> property": {
    "files": {
      "pom.xml": "<project xmlns=\"http://maven.apache.org/POM/4.0.0\"><modelVersion>4.0.0</modelVersion><groupId>a</groupId><artifactId>b</artifactId><version>1</version><packaging>jar</packaging><properties><maven.compiler.release>17</maven.compiler.release></properties><dependencies><dependency><groupId>org.springframework</groupId><artifactId>spring-context</artifactId><version>6.1.3</version></dependency></dependencies></project>"
    },
    "expect": {
      "languageVersion": "17",
      "frameworkVersion": "6.1.3"
    }
  },
  "R10 Gradle multi-module: root subprojects{} block with legacy coords": {
    "files": {
      "build.gradle": "subprojects {\n  apply plugin: 'java'\n  sourceCompatibility = 1.7\n  dependencies { compile 'org.springframework:spring-context:4.3.30.RELEASE' }\n}",
      "settings.gradle": "include 'core', 'web'",
      "web/build.gradle": "apply plugin: 'war'"
    },
    "expect": {
      "language": "java",
      "languageVersion": "7",
      "framework": "spring-framework",
      "frameworkVersion": "4.3.30.RELEASE"
    }
  },
  "R11 Maven multi-module: NON-conventional root property name referenced by child": {
    "files": {
      "pom.xml": "<project xmlns=\"http://maven.apache.org/POM/4.0.0\"><modelVersion>4.0.0</modelVersion><groupId>a</groupId><artifactId>b</artifactId><version>1</version><packaging>pom</packaging><modules><module>web</module></modules><properties><acme.spring.ver>4.1.9.RELEASE</acme.spring.ver></properties></project>",
      "web/pom.xml": "<project xmlns=\"http://maven.apache.org/POM/4.0.0\"><modelVersion>4.0.0</modelVersion><groupId>a</groupId><artifactId>b</artifactId><version>1</version><packaging>war</packaging><dependencies><dependency><groupId>org.springframework</groupId><artifactId>spring-webmvc</artifactId><version>${acme.spring.ver}</version></dependency></dependencies></project>"
    },
    "expect": {
      "framework": "spring-framework",
      "frameworkVersion": "4.1.9.RELEASE"
    }
  },
  "S01 Spring 1.x Maven groupId springframework": {
    "files": {
      "pom.xml": "<project xmlns=\"http://maven.apache.org/POM/4.0.0\"><modelVersion>4.0.0</modelVersion><groupId>a</groupId><artifactId>b</artifactId><version>1</version><packaging>war</packaging><dependencies><dependency><groupId>springframework</groupId><artifactId>spring</artifactId><version>1.2.9</version></dependency><dependency><groupId>springframework</groupId><artifactId>spring-mock</artifactId><version>1.2.9</version></dependency></dependencies></project>"
    },
    "expect": {
      "framework": "spring-framework",
      "frameworkVersion": "1.2.9",
      "packaging": "war"
    }
  },
  "S02 Spring 1.x Gradle coord springframework:spring": {
    "files": {
      "build.gradle": "apply plugin: 'war'\ndependencies { compile 'springframework:spring:1.2.9' }"
    },
    "expect": {
      "framework": "spring-framework",
      "frameworkVersion": "1.2.9",
      "packaging": "war"
    }
  },
  "S03 map notation name: before group:": {
    "files": {
      "build.gradle": "apply plugin: 'java'\ndependencies { compile name: 'spring-webmvc', group: 'org.springframework', version: '4.3.30.RELEASE' }"
    },
    "expect": {
      "framework": "spring-framework",
      "frameworkVersion": "4.3.30.RELEASE"
    }
  },
  "S04 ${project.springVersion} / ${rootProject.ext.springVersion}": {
    "files": {
      "build.gradle": "apply plugin: 'java'\next { springVersion = '4.3.30.RELEASE' }\ndependencies {\n compile \"org.springframework:spring-webmvc:${project.springVersion}\"\n compile \"org.springframework:spring-jdbc:${rootProject.ext.springVersion}\"\n}"
    },
    "expect": {
      "framework": "spring-framework",
      "frameworkVersion": "4.3.30.RELEASE"
    }
  },
  "S05 apply from: 'gradle/dependencies.gradle' with ext.versions map": {
    "files": {
      "build.gradle": "apply plugin: 'java'\napply from: 'gradle/dependencies.gradle'\ndependencies { compile \"org.springframework:spring-webmvc:${versions.spring}\" }",
      "gradle/dependencies.gradle": "ext {\n  versions = [\n    spring : '4.3.30.RELEASE',\n    junit  : '4.12'\n  ]\n}"
    },
    "expect": {
      "framework": "spring-framework",
      "frameworkVersion": "4.3.30.RELEASE"
    }
  },
  "S06 buildSrc Versions.kt object": {
    "files": {
      "build.gradle.kts": "plugins { java }\ndependencies { implementation(\"org.springframework:spring-context:${Versions.spring}\") }",
      "buildSrc/src/main/kotlin/Versions.kt": "object Versions {\n    const val spring = \"5.3.30\"\n    const val junit = \"5.10.0\"\n}",
      "src/main/java/A.java": ""
    },
    "expect": {
      "framework": "spring-framework",
      "frameworkVersion": "5.3.30"
    }
  },
  "S07 settings.gradle-only root, build.gradle in module": {
    "files": {
      "settings.gradle": "rootProject.name = 'erp'\ninclude 'web'",
      "web/build.gradle": "apply plugin: 'war'\nsourceCompatibility = 1.7\ndependencies { compile 'org.springframework:spring-webmvc:4.0.9.RELEASE' }"
    },
    "expect": {
      "language": "java",
      "languageVersion": "7",
      "buildTool": "gradle",
      "framework": "spring-framework",
      "frameworkVersion": "4.0.9.RELEASE",
      "packaging": "war"
    }
  },
  "S08 Gradle options.release / release.set": {
    "files": {
      "build.gradle": "plugins { id 'java' }\ntasks.withType(JavaCompile) { options.release = 17 }\ndependencies { implementation 'org.springframework:spring-context:6.1.3' }"
    },
    "expect": {
      "languageVersion": "17"
    }
  },
  "S09 no root pom, sibling projects at depth 1": {
    "files": {
      "erp-web/pom.xml": "<project xmlns=\"http://maven.apache.org/POM/4.0.0\"><modelVersion>4.0.0</modelVersion><groupId>a</groupId><artifactId>b</artifactId><version>1</version><packaging>war</packaging><dependencies><dependency><groupId>org.springframework</groupId><artifactId>spring-webmvc</artifactId><version>3.2.18.RELEASE</version></dependency></dependencies></project>",
      "erp-batch/pom.xml": "<project xmlns=\"http://maven.apache.org/POM/4.0.0\"><modelVersion>4.0.0</modelVersion><groupId>a</groupId><artifactId>b</artifactId><version>1</version><packaging>jar</packaging><dependencies><dependency><groupId>org.springframework</groupId><artifactId>spring-context</artifactId><version>3.2.18.RELEASE</version></dependency></dependencies></project>",
      "erp-web/src/main/java/A.java": ""
    },
    "expect": {
      "language": "java",
      "buildTool": "maven",
      "framework": "spring-framework",
      "frameworkVersion": "3.2.18.RELEASE"
    }
  },
  "S10 Korean-market DB coords in Maven": {
    "files": {
      "pom.xml": "<project xmlns=\"http://maven.apache.org/POM/4.0.0\"><modelVersion>4.0.0</modelVersion><groupId>a</groupId><artifactId>b</artifactId><version>1</version><packaging>jar</packaging><dependencies><dependency><groupId>org.springframework</groupId><artifactId>spring-jdbc</artifactId><version>4.3.30.RELEASE</version></dependency><dependency><groupId>com.tmax.tibero</groupId><artifactId>tibero6-jdbc</artifactId><version>6.0</version></dependency><dependency><groupId>cubrid</groupId><artifactId>cubrid-jdbc</artifactId><version>11.2.0</version></dependency><dependency><groupId>com.microsoft.sqlserver</groupId><artifactId>mssql-jdbc</artifactId><version>9.4.1.jre8</version></dependency></dependencies></project>"
    },
    "expect": {
      "databases": [
        "mssql",
        "tibero",
        "cubrid"
      ]
    }
  },
  "S11 Korean-market DB coords in Gradle": {
    "files": {
      "build.gradle": "apply plugin: 'java'\ndependencies {\n compile 'org.springframework:spring-jdbc:4.3.30.RELEASE'\n compile 'com.altibase:altibase-jdbc:7.1'\n compile 'com.ibm.db2:jcc:11.5.8.0'\n}"
    },
    "expect": {
      "databases": [
        "db2",
        "altibase"
      ]
    }
  },
  "S12 .settings jdt.core.prefs compliance level": {
    "files": {
      ".settings/org.eclipse.jdt.core.prefs": "eclipse.preferences.version=1\norg.eclipse.jdt.core.compiler.compliance=1.6\norg.eclipse.jdt.core.compiler.source=1.6",
      ".project": "<projectDescription><natures><nature>org.eclipse.jdt.core.javanature</nature></natures></projectDescription>",
      "src/A.java": ""
    },
    "expect": {
      "language": "java",
      "languageVersion": "6"
    }
  },
  "S13 .classpath custom JRE name jdk1.6.0_45": {
    "files": {
      ".classpath": "<classpath><classpathentry kind=\"src\" path=\"src\"/><classpathentry kind=\"con\" path=\"org.eclipse.jdt.launching.JRE_CONTAINER/org.eclipse.jdt.internal.debug.ui.launcher.StandardVMType/jdk1.6.0_45\"/></classpath>",
      "src/A.java": ""
    },
    "expect": {
      "language": "java",
      "languageVersion": "6"
    }
  },
  "S14 .classpath kind=lib jar entries (jars NOT committed)": {
    "files": {
      ".classpath": "<classpath><classpathentry kind=\"src\" path=\"src\"/><classpathentry kind=\"lib\" path=\"WebContent/WEB-INF/lib/spring-webmvc-3.0.5.RELEASE.jar\"/><classpathentry kind=\"var\" path=\"M2_REPO/com/oracle/ojdbc6/11.2.0.3/ojdbc6-11.2.0.3.jar\"/><classpathentry kind=\"lib\" path=\"WebContent/WEB-INF/lib/ibatis-sqlmap-2.3.4.726.jar\"/></classpath>",
      "src/A.java": ""
    },
    "expect": {
      "language": "java",
      "framework": "spring-framework",
      "frameworkVersion": "3.0.5.RELEASE",
      "database": "oracle",
      "orm": "ibatis",
      "packaging": "war"
    }
  },
  "S15 jars in lib subfolders": {
    "files": {
      "lib/spring/spring-webmvc-3.2.18.RELEASE.jar": "",
      "lib/db/ojdbc6.jar": "",
      "src/A.java": ""
    },
    "expect": {
      "framework": "spring-framework",
      "frameworkVersion": "3.2.18.RELEASE",
      "database": "oracle"
    }
  },
  "S16 WEB-INF/web.xml DispatcherServlet, no jars": {
    "files": {
      "WebContent/WEB-INF/web.xml": "<web-app xmlns=\"http://java.sun.com/xml/ns/javaee\" version=\"2.5\"><servlet><servlet-name>action</servlet-name><servlet-class>org.springframework.web.servlet.DispatcherServlet</servlet-class></servlet></web-app>",
      "src/A.java": ""
    },
    "expect": {
      "language": "java",
      "framework": "spring-framework",
      "packaging": "war"
    }
  },
  "S17 Spring XSD version hint from context xml (no other version source)": {
    "files": {
      "WebContent/WEB-INF/web.xml": "<web-app version=\"2.4\"><listener><listener-class>org.springframework.web.context.ContextLoaderListener</listener-class></listener></web-app>",
      "WebContent/WEB-INF/applicationContext.xml": "<beans xmlns=\"http://www.springframework.org/schema/beans\" xsi:schemaLocation=\"http://www.springframework.org/schema/beans http://www.springframework.org/schema/beans/spring-beans-3.0.xsd http://www.springframework.org/schema/context http://www.springframework.org/schema/context/spring-context-3.0.xsd\"/>",
      "src/A.java": ""
    },
    "expect": {
      "framework": "spring-framework",
      "frameworkVersion": "3.0"
    },
    "detectedHas": "spring-xsd 3.0"
  },
  "S18 XSD hint must NOT override a jar-derived version": {
    "files": {
      "WebContent/WEB-INF/lib/spring-core-3.0.5.RELEASE.jar": "",
      "WebContent/WEB-INF/applicationContext.xml": "<beans xsi:schemaLocation=\"http://www.springframework.org/schema/beans/spring-beans-2.5.xsd\"/>",
      "src/A.java": ""
    },
    "expect": {
      "frameworkVersion": "3.0.5.RELEASE"
    }
  },
  "S19 IntelliJ .idea/misc.xml language level": {
    "files": {
      ".idea/misc.xml": "<project version=\"4\"><component name=\"ProjectRootManager\" version=\"2\" languageLevel=\"JDK_1_7\" project-jdk-name=\"1.7\"/></project>",
      "src/A.java": ""
    },
    "expect": {
      "language": "java",
      "languageVersion": "7"
    }
  },
  "S20 NetBeans nbproject/project.properties": {
    "files": {
      "nbproject/project.properties": "javac.source=1.6\njavac.target=1.6\nfile.reference.spring-webmvc-3.0.5.RELEASE.jar=lib/spring-webmvc-3.0.5.RELEASE.jar",
      "src/A.java": ""
    },
    "expect": {
      "language": "java",
      "languageVersion": "6",
      "framework": "spring-framework",
      "frameworkVersion": "3.0.5.RELEASE"
    }
  },
  "S21 Struts 1 + iBatis (no spring) gets a struts tag": {
    "files": {
      "pom.xml": "<project xmlns=\"http://maven.apache.org/POM/4.0.0\"><modelVersion>4.0.0</modelVersion><groupId>a</groupId><artifactId>b</artifactId><version>1</version><packaging>war</packaging><dependencies><dependency><groupId>struts</groupId><artifactId>struts</artifactId><version>1.2.9</version></dependency><dependency><groupId>org.apache.ibatis</groupId><artifactId>ibatis-sqlmap</artifactId><version>2.3.4.726</version></dependency></dependencies></project>"
    },
    "expect": {
      "framework": null,
      "orm": "ibatis"
    },
    "detectedHas": "struts 1.2.9"
  },
  "S22 Struts 2 + Spring plugin: spring-framework, struts2 tag": {
    "files": {
      "pom.xml": "<project xmlns=\"http://maven.apache.org/POM/4.0.0\"><modelVersion>4.0.0</modelVersion><groupId>a</groupId><artifactId>b</artifactId><version>1</version><packaging>war</packaging><dependencies><dependency><groupId>org.apache.struts</groupId><artifactId>struts2-core</artifactId><version>2.5.33</version></dependency><dependency><groupId>org.apache.struts</groupId><artifactId>struts2-spring-plugin</artifactId><version>2.5.33</version></dependency><dependency><groupId>org.springframework</groupId><artifactId>spring-web</artifactId><version>4.3.30.RELEASE</version></dependency></dependencies></project>"
    },
    "expect": {
      "framework": "spring-framework",
      "frameworkVersion": "4.3.30.RELEASE"
    },
    "detectedHas": "struts2 2.5.33"
  },
  "S23 EUC-KR encoded pom with Korean comments still detects": {
    "files": {
      "pom.xml": {
        "__b64": "PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iRVVDLUtSIj8+PHByb2plY3Q+PG1vZGVsVmVyc2lvbj40LjAuMDwvbW9kZWxWZXJzaW9uPjxncm91cElkPmE8L2dyb3VwSWQ+PGFydGlmYWN0SWQ+YjwvYXJ0aWZhY3RJZD48dmVyc2lvbj4xPC92ZXJzaW9uPjxwYWNrYWdpbmc+d2FyPC9wYWNrYWdpbmc+PCEtLSDH0bHbIMHWvK4gLS0+PGRlcGVuZGVuY2llcz48ZGVwZW5kZW5jeT48Z3JvdXBJZD5vcmcuc3ByaW5nZnJhbWV3b3JrPC9ncm91cElkPjxhcnRpZmFjdElkPnNwcmluZy13ZWJtdmM8L2FydGlmYWN0SWQ+PHZlcnNpb24+My4yLjE4LlJFTEVBU0U8L3ZlcnNpb24+PC9kZXBlbmRlbmN5PjwvZGVwZW5kZW5jaWVzPjwvcHJvamVjdD4="
      }
    },
    "expect": {
      "framework": "spring-framework",
      "frameworkVersion": "3.2.18.RELEASE",
      "packaging": "war"
    }
  },
  "X01 Boot + security + data must NOT pollute springFrameworkVersion": {
    "files": {
      "build.gradle": "plugins { id 'java'; id 'org.springframework.boot' version '3.2.0' }\ndependencies {\n implementation 'org.springframework.boot:spring-boot-starter-web'\n implementation 'org.springframework.security:spring-security-core:6.2.0'\n implementation 'org.springframework.data:spring-data-jpa:3.2.0'\n implementation 'org.springframework.cloud:spring-cloud-starter:4.1.0'\n}"
    },
    "expect": {
      "framework": "spring-boot",
      "frameworkVersion": "3.2.0",
      "springFrameworkVersion": null
    }
  },
  "X02 spring-security only (no framework coord) is NOT spring-framework": {
    "files": {
      "build.gradle": "plugins { id 'java' }\ndependencies { implementation 'org.springframework.security:spring-security-core:5.8.0' }"
    },
    "expect": {
      "language": "java",
      "framework": null,
      "frameworkVersion": null,
      "springFrameworkVersion": null
    }
  },
  "X03 spring-data-jpa only is NOT spring-framework": {
    "files": {
      "pom.xml": "<project><modelVersion>4.0.0</modelVersion><groupId>a</groupId><artifactId>b</artifactId><version>1</version><packaging>jar</packaging><dependencies><dependency><groupId>org.springframework.data</groupId><artifactId>spring-data-jpa</artifactId><version>2.7.18</version></dependency></dependencies></project>"
    },
    "expect": {
      "language": "java",
      "framework": null,
      "frameworkVersion": null
    }
  },
  "X04 Android com.android.application is not the JVM 'application' plugin": {
    "files": {
      "build.gradle": "plugins { id 'com.android.application' version '8.2.0' }\nandroid { compileSdk 34 }"
    },
    "expect": {
      "language": null,
      "framework": null,
      "packaging": null
    }
  },
  "X05 Kotlin + Spring Framework (non-Boot) stays kotlin": {
    "files": {
      "build.gradle.kts": "plugins { kotlin(\"jvm\") version \"1.9.22\" }\ndependencies { implementation(\"org.springframework:spring-context:6.1.3\") }",
      "src/main/kotlin/A.kt": "class A"
    },
    "expect": {
      "language": "kotlin",
      "framework": "spring-framework",
      "frameworkVersion": "6.1.3"
    }
  },
  "X06 modern project with stray top-level src/ is NOT mis-rooted": {
    "files": {
      "build.gradle": "plugins { id 'java'; id 'org.springframework.boot' version '3.2.0' }",
      "src/main/java/com/ex/UserController.java": "",
      "src/legacy/Old.java": ""
    },
    "expect": {
      "language": "java",
      "framework": "spring-boot"
    }
  },
  "X07 .classpath test folder is ignored as a source root": {
    "files": {
      ".classpath": "<classpath><classpathentry kind=\"src\" path=\"src/test/java\"/><classpathentry kind=\"con\" path=\"org.eclipse.jdt.launching.JRE_CONTAINER/JavaSE-11\"/></classpath>",
      ".project": "<projectDescription><natures><nature>org.eclipse.jdt.core.javanature</nature></natures></projectDescription>",
      "src/test/java/T.java": ""
    },
    "expect": {
      "language": "java",
      "languageVersion": "11",
      "framework": null
    }
  },
  "X08 spring-security jar in WEB-INF/lib is NOT spring-framework": {
    "files": {
      "WebContent/WEB-INF/lib/spring-security-web-5.8.0.jar": "",
      "WebContent/WEB-INF/lib/spring-ldap-core-2.4.1.jar": "",
      "src/A.java": ""
    },
    "expect": {
      "language": "java",
      "framework": null,
      "frameworkVersion": null,
      "packaging": "war"
    }
  },
  "X09 Boot jar in lib wins over Framework jars": {
    "files": {
      "lib/spring-boot-2.7.18.jar": "",
      "lib/spring-core-5.3.31.jar": "",
      "src/A.java": ""
    },
    "expect": {
      "language": "java",
      "framework": "spring-boot",
      "frameworkVersion": "2.7.18",
      "springFrameworkVersion": "5.3.31"
    }
  },
  "X10 Maven parent is corporate pom, starter-parent only in a dependency": {
    "files": {
      "pom.xml": "<project><modelVersion>4.0.0</modelVersion><groupId>a</groupId><artifactId>b</artifactId><version>1</version><parent><groupId>com.acme</groupId><artifactId>acme-parent</artifactId><version>9.9.9</version></parent><dependencies><dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-web</artifactId><version>2.5.0</version></dependency></dependencies></project>"
    },
    "expect": {
      "framework": "spring-boot",
      "frameworkVersion": null
    }
  },
  "X11 Gradle var reference to undefined var yields null, never the literal": {
    "files": {
      "build.gradle": "apply plugin: 'java'\ndependencies { compile \"org.springframework:spring-webmvc:${springVersion}\" }"
    },
    "expect": {
      "framework": "spring-framework",
      "frameworkVersion": null
    }
  },
  "X12 Maven ${prop} undefined yields null": {
    "files": {
      "pom.xml": "<project><modelVersion>4.0.0</modelVersion><groupId>a</groupId><artifactId>b</artifactId><version>1</version><packaging>war</packaging><dependencies><dependency><groupId>org.springframework</groupId><artifactId>spring-webmvc</artifactId><version>${spring.version}</version></dependency></dependencies></project>"
    },
    "expect": {
      "framework": "spring-framework",
      "frameworkVersion": null,
      "packaging": "war"
    }
  },
  "X13 commented-out Gradle line still counts (Gradle has no comment strip) — documented": {
    "files": {
      "build.gradle": "apply plugin: 'java'\n// compile 'org.springframework:spring-webmvc:4.3.30.RELEASE'"
    },
    "expect": {
      "language": "java"
    }
  },
  "X14 Node project untouched": {
    "files": {
      "package.json": "{\"dependencies\":{\"express\":\"^4\"}}",
      "src/index.js": ""
    },
    "expect": {
      "language": "javascript",
      "framework": "express",
      "packaging": null,
      "springFrameworkVersion": null
    }
  },
  "X15 Python project untouched": {
    "files": {
      "requirements.txt": "Django==5.0",
      "src/x.py": ""
    },
    "expect": {
      "language": "python",
      "framework": "django",
      "packaging": null
    }
  },
  "Y01 Node project + .idea/misc.xml JDK_17 stays javascript": {
    "files": {
      "package.json": "{\"dependencies\":{\"express\":\"^4\"}}",
      ".idea/misc.xml": "<project><component name=\"ProjectRootManager\" languageLevel=\"JDK_17\"/></project>",
      "src/index.js": ""
    },
    "expect": {
      "language": "javascript",
      "framework": "express",
      "languageVersion": null,
      "packaging": null
    }
  },
  "Y02 Python project + stray WEB-INF/web.xml stays python": {
    "files": {
      "requirements.txt": "Django==5.0",
      "legacy/WEB-INF/web.xml": "<web-app><servlet-class>org.springframework.web.servlet.DispatcherServlet</servlet-class></web-app>",
      "app.py": ""
    },
    "expect": {
      "language": "python",
      "framework": "django",
      "packaging": null
    }
  },
  "Y03 Node project + vendored lib/*.jar stays javascript": {
    "files": {
      "package.json": "{\"dependencies\":{\"next\":\"^14\"}}",
      "tools/lib/spring-core-5.3.31.jar": ""
    },
    "expect": {
      "language": "javascript",
      "frontend": "nextjs",
      "packaging": null,
      "springFrameworkVersion": null
    }
  },
  "Y04 Kotlin project + .settings jdt prefs stays kotlin": {
    "files": {
      "build.gradle.kts": "plugins { kotlin(\"jvm\") version \"1.9.22\" }",
      ".settings/org.eclipse.jdt.core.prefs": "org.eclipse.jdt.core.compiler.compliance=1.8",
      "src/main/kotlin/A.kt": ""
    },
    "expect": {
      "language": "kotlin"
    }
  },
  "Y05 Spring Boot project with a legacy web.xml (WAR deployment) keeps Boot version": {
    "files": {
      "pom.xml": "<project><parent><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-parent</artifactId><version>2.7.18</version></parent><packaging>war</packaging><dependencies><dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-web</artifactId></dependency></dependencies></project>",
      "src/main/webapp/WEB-INF/web.xml": "<web-app version=\"3.1\"/>",
      "src/main/webapp/WEB-INF/applicationContext.xml": "<beans xsi:schemaLocation=\"http://www.springframework.org/schema/beans/spring-beans-2.5.xsd\"/>"
    },
    "expect": {
      "framework": "spring-boot",
      "frameworkVersion": "2.7.18",
      "packaging": "war"
    }
  },
  "Y06 XSD hint never overrides an explicit Framework version": {
    "files": {
      "pom.xml": "<project><dependencies><dependency><groupId>org.springframework</groupId><artifactId>spring-webmvc</artifactId><version>4.3.30.RELEASE</version></dependency></dependencies></project>",
      "src/main/webapp/WEB-INF/spring/app.xml": "<beans xsi:schemaLocation=\"http://www.springframework.org/schema/beans/spring-beans-3.0.xsd\"/>"
    },
    "expect": {
      "frameworkVersion": "4.3.30.RELEASE"
    }
  },
  "Y07 map notation for spring-security is NOT the Framework": {
    "files": {
      "build.gradle": "apply plugin: 'java'\ndependencies { compile group: 'org.springframework.security', name: 'spring-security-core', version: '5.8.0' }"
    },
    "expect": {
      "framework": null,
      "frameworkVersion": null
    }
  },
  "Y08 Struts tag never sets framework": {
    "files": {
      "build.gradle": "apply plugin: 'war'\ndependencies { compile 'org.apache.struts:struts2-core:2.5.33' }"
    },
    "expect": {
      "framework": null
    },
    "detectedHas": "struts2 2.5.33"
  },
  "Y09 sibling projects: Node sibling does not trigger Maven mode": {
    "files": {
      "web/package.json": "{\"dependencies\":{\"react\":\"^18\"}}",
      "api/pom.xml": "<project><dependencies><dependency><groupId>org.springframework</groupId><artifactId>spring-webmvc</artifactId><version>5.3.30</version></dependency></dependencies></project>",
      "api/src/main/java/A.java": ""
    },
    "expect": {
      "buildTool": "maven",
      "framework": "spring-framework",
      "frameworkVersion": "5.3.30"
    }
  },
  "Y10 mssql keyword does not fire on r2dbc-postgresql etc.": {
    "files": {
      "build.gradle": "plugins { id 'java'; id 'org.springframework.boot' version '3.2.0' }\ndependencies { runtimeOnly 'org.postgresql:r2dbc-postgresql' }"
    },
    "expect": {
      "databases": [
        "postgresql"
      ]
    }
  },
  "Y11 Java WAR + root package.json for gulp assets → reclaimed as java": {
    "files": {
      "package.json": "{\"devDependencies\":{\"gulp\":\"^4\",\"jquery\":\"^3\"}}",
      "build.xml": "<project><target name=\"compile\"><javac srcdir=\"src\" source=\"1.6\"/></target></project>",
      "WebContent/WEB-INF/lib/spring-webmvc-3.2.18.RELEASE.jar": "",
      "src/com/acme/A.java": ""
    },
    "expect": {
      "language": "java",
      "languageVersion": "6",
      "framework": "spring-framework",
      "frameworkVersion": "3.2.18.RELEASE",
      "buildTool": "ant"
    }
  },
  "Y12 Java WAR + root package.json with Next.js → stays Node (frontend)": {
    "files": {
      "package.json": "{\"dependencies\":{\"next\":\"^14\",\"react\":\"^18\"}}",
      "WebContent/WEB-INF/web.xml": "<web-app><servlet-class>org.springframework.web.servlet.DispatcherServlet</servlet-class></web-app>",
      "src/A.java": ""
    },
    "expect": {
      "language": "javascript"
    }
  },
  "Y13 jars beside .java but NO other evidence → java (weak+sources ok)": {
    "files": {
      "lib/spring-core-4.3.30.RELEASE.jar": "",
      "src/com/acme/A.java": ""
    },
    "expect": {
      "language": "java",
      "framework": "spring-framework",
      "frameworkVersion": "4.3.30.RELEASE"
    }
  },
  "Y14 jars only, no sources, no manifest → nothing claimed": {
    "files": {
      "lib/spring-core-5.3.31.jar": "",
      "README.md": "docs only"
    },
    "expect": {
      "language": null,
      "framework": null,
      "frameworkVersion": null,
      "springFrameworkVersion": null,
      "database": null,
      "orm": null
    }
  },
  "Y15 driver jar only, no sources → no database either": {
    "files": {
      "lib/ojdbc6.jar": "",
      "lib/ibatis-sqlmap-2.3.4.jar": ""
    },
    "expect": {
      "language": null,
      "database": null,
      "orm": null
    }
  },
  "Z01 provisional Node language is RESTORED when build.xml is an empty stub (no JVM claim)": {
    "files": {
      "package.json": "{\"devDependencies\":{\"gulp\":\"^4\"}}",
      "build.xml": "",
      "assets/app.js": ""
    },
    "expect": {
      "language": "javascript",
      "buildTool": null,
      "packageManager": "npm",
      "detected": ["package.json"]
    }
  },
  "Z02 Phing-style build.xml (<project> but no <javac>, no *.java) is NOT Ant — Node language kept": {
    "files": {
      "package.json": "{\"devDependencies\":{\"gulp\":\"^4\"}}",
      "build.xml": "<project name=\"site\" default=\"build\"><target name=\"build\"/></project>",
      "src/index.php": ""
    },
    "expect": {
      "language": "javascript",
      "buildTool": null,
      "framework": null,
      "detected": ["package.json"]
    }
  },
  "Z03 reclaimed Java project takes the JVM package manager, not npm": {
    "files": {
      "package.json": "{\"devDependencies\":{\"gulp\":\"^4\"}}",
      "package-lock.json": "{}",
      "build.xml": "<project><target name=\"c\"><javac srcdir=\"src\" source=\"1.7\"/></target></project>",
      "src/com/acme/A.java": ""
    },
    "expect": {
      "language": "java",
      "languageVersion": "7",
      "buildTool": "ant",
      "packageManager": "ant"
    },
    "detectedHas": "java (reclaimed from provisional package.json language)"
  },
  "Z04 Boot project: a src/test/resources web.xml is neither packaging nor a detected tag": {
    "files": {
      "build.gradle": "plugins { id 'java'; id 'org.springframework.boot' version '3.2.0' }",
      "src/test/resources/WEB-INF/web.xml": "<web-app version=\"4.0\"/>"
    },
    "expect": {
      "framework": "spring-boot",
      "packaging": null,
      "detected": ["build.gradle", "spring-boot", "logback (spring-boot default)"]
    }
  },
  "Z05 Boot WAR + src/main/webapp web.xml: detected stays byte-identical to v2.5.0": {
    "files": {
      "pom.xml": "<project><parent><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-parent</artifactId><version>2.7.18</version></parent><packaging>war</packaging><dependencies><dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-web</artifactId></dependency></dependencies></project>",
      "src/main/webapp/WEB-INF/web.xml": "<web-app version=\"3.1\"><servlet-class>org.springframework.web.servlet.DispatcherServlet</servlet-class></web-app>"
    },
    "expect": {
      "framework": "spring-boot",
      "frameworkVersion": "2.7.18",
      "packaging": "war",
      "detected": ["pom.xml", "spring-boot", "logback (spring-boot default)"]
    }
  },
  "Z06 Boot + struts2 coordinate: no legacy tag pushed into a Boot project's detected": {
    "files": {
      "build.gradle": "plugins { id 'java'; id 'org.springframework.boot' version '3.2.0' }\ndependencies { implementation 'org.apache.struts:struts2-core:2.5.33' }"
    },
    "expect": {
      "framework": "spring-boot",
      "detected": ["build.gradle", "spring-boot", "logback (spring-boot default)"]
    }
  },
  "Z07 non-Boot Java + src/test/resources web.xml: test fixtures are not deployment evidence": {
    "files": {
      "build.gradle": "plugins { id 'java' }\ndependencies { implementation 'org.springframework:spring-context:5.3.30' }",
      "src/test/resources/WEB-INF/web.xml": "<web-app version=\"3.1\"/>"
    },
    "expect": {
      "framework": "spring-framework",
      "packaging": null
    }
  }
};

describe("stack-detector — legacy JVM matrix", () => {
  let tmp;
  beforeEach(() => { tmp = fs.mkdtempSync(path.join(os.tmpdir(), "cos-legacy-")); });
  afterEach(() => { fs.rmSync(tmp, { recursive: true, force: true }); });

  for (const [name, { files, expect, detectedHas }] of Object.entries(CASES)) {
    it(name, async () => {
      for (const [rel, content] of Object.entries(files)) {
        const p = path.join(tmp, rel);
        fs.mkdirSync(path.dirname(p), { recursive: true });
        fs.writeFileSync(p, content && content.__b64 ? Buffer.from(content.__b64, "base64") : content);
      }
      const s = await detectStack(tmp);
      for (const [k, v] of Object.entries(expect)) {
        const got = s[k] === undefined ? null : s[k];
        assert.deepStrictEqual(got, v, `${k}: got ${JSON.stringify(got)}, want ${JSON.stringify(v)}`);
      }
      if (detectedHas) assert.ok(s.detected.includes(detectedHas), `detected lacks ${detectedHas}: ${JSON.stringify(s.detected)}`);
    });
  }
});
